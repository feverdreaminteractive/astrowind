#!/usr/bin/env python3
"""
hdr_glow.py -- make selected pixels of a logo physically glow on HDR displays.

    python3 hdr_glow.py logo.svg out.jpg --glow-nits 1000 --width 1600

Pipeline:
  1. render SVG -> PNG via rsvg-convert (skipped if input is already a raster)
  2. build a mask of "bright" pixels (luma high, saturation low) by default,
     or of a specific colour with --target-hex
  3. sRGB -> linear -> Rec.2020 linear, scale masked pixels to --glow-nits and
     everything else to --sdr-nits, then PQ-encode
  4. write JPEG with the Rec2020+PQ ICC profile embedded

Requires: pip3 install Pillow numpy
Optional: brew install librsvg   (only for .svg input)
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import numpy as np
from PIL import Image, ImageFilter

# PQ EOTF constants (SMPTE ST 2084)
M1 = 2610 / 16384
M2 = 2523 / 4096 * 128
C1 = 3424 / 4096
C2 = 2413 / 4096 * 32
C3 = 2392 / 4096 * 32

# sRGB(D65) -> XYZ -> Rec2020(D65), no chromatic adaptation needed
SRGB_TO_REC2020 = np.array([
    [0.62740390, 0.32928304, 0.04331307],
    [0.06909729, 0.91954040, 0.01136232],
    [0.01639144, 0.08801331, 0.89559525],
])


def pq_inverse_eotf(nits):
    """Absolute nits -> PQ code value [0,1]."""
    y = np.clip(nits / 10000.0, 0.0, 1.0)
    ym = y ** M1
    return ((C1 + C2 * ym) / (1.0 + C3 * ym)) ** M2


def pq_eotf(v):
    """PQ code value [0,1] -> absolute luminance in nits."""
    v = np.clip(v, 0.0, 1.0)
    v_pow = v ** (1 / M2)
    num = np.maximum(v_pow - C1, 0.0)
    den = C2 - C3 * v_pow
    # Avoid divide by zero
    den = np.where(den > 0, den, 1e-10)
    return 10000.0 * (num / den) ** (1 / M1)


def srgb_to_linear(x):
    """sRGB transfer function to linear."""
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def render_svg(svg_path, width):
    """Render SVG to PNG using rsvg-convert."""
    exe = shutil.which("rsvg-convert")
    if not exe:
        sys.exit("rsvg-convert not found. Install it with:  brew install librsvg")

    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp.close()

    cmd = [exe, "-w", str(width), "-h", str(width), "-a",
           "-b", "none", "-o", tmp.name, svg_path]

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running rsvg-convert: {e.stderr}")
        os.unlink(tmp.name)
        sys.exit(1)

    return tmp.name


def build_mask(rgb, mode, target_hex, luma_thr, sat_thr):
    """
    Build mask of pixels to push into HDR.
    rgb is float [0,1], HxWx3. Returns bool mask.
    """
    if target_hex:
        # Target specific hex color
        target_hex = target_hex.lstrip('#')
        t = np.array([int(target_hex[i:i + 2], 16) for i in (0, 2, 4)]) / 255.0
        # Allow some tolerance for matching
        return np.all(np.abs(rgb - t) < (12 / 255.0), axis=-1)

    # Compute saturation
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0.0)

    # Compute luma
    luma = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]

    if mode == "bright":
        # Select bright, desaturated pixels
        return (luma >= luma_thr) & (sat <= sat_thr)
    elif mode == "saturated":
        # Select saturated pixels (the colored parts)
        return sat > sat_thr
    else:
        raise ValueError(f"Unknown mode: {mode}")


def main():
    parser = argparse.ArgumentParser(description="Make logo pixels glow on HDR displays")
    parser.add_argument("input", help="Input logo file (SVG or raster)")
    parser.add_argument("output", help="Output JPEG file")
    parser.add_argument("--width", type=int, default=1600,
                        help="Output width in pixels (default: 1600)")
    parser.add_argument("--glow-nits", type=float, default=1000.0,
                        help="Peak luminance for glowing pixels (default: 1000)")
    parser.add_argument("--sdr-nits", type=float, default=203.0,
                        help="BT.2408 reference white for graphics (default: 203)")
    parser.add_argument("--mode", choices=["bright", "saturated"], default="saturated",
                        help="Glow mode: bright (light pixels) or saturated (colored pixels)")
    parser.add_argument("--target-hex", default=None,
                        help="Glow this exact colour instead (e.g., F0F0F0)")
    parser.add_argument("--luma-thr", type=float, default=0.75,
                        help="Luminance threshold for bright mode (default: 0.75)")
    parser.add_argument("--sat-thr", type=float, default=0.15,
                        help="Saturation threshold (default: 0.15)")
    parser.add_argument("--icc", default="Rec2020-PQ.icc",
                        help="Path to ICC profile (default: Rec2020-PQ.icc)")
    parser.add_argument("--bg", default="000000",
                        help="Background color for alpha flattening (default: 000000)")
    parser.add_argument("--quality", type=int, default=95,
                        help="JPEG quality (default: 95)")
    parser.add_argument("--feather", type=float, default=0.0,
                        help="Blur radius in px to soften the glow edge (default: 0)")

    args = parser.parse_args()

    # Handle input file
    src = args.input
    tmp_png = None

    if src.lower().endswith(".svg"):
        print(f"Rendering SVG at {args.width}px...")
        tmp_png = render_svg(src, args.width)
        src = tmp_png

    # Load image
    im = Image.open(src)

    # Handle alpha channel - flatten onto background
    if im.mode in ("RGBA", "LA", "P"):
        if im.mode == "P":
            im = im.convert("RGBA")
        elif im.mode == "LA":
            im = im.convert("RGBA")

        # Parse background color
        bg_hex = args.bg.lstrip('#')
        bg = tuple(int(bg_hex[i:i + 2], 16) for i in (0, 2, 4))

        # Create background and paste with alpha
        flat = Image.new("RGB", im.size, bg)
        flat.paste(im, mask=im.split()[-1] if im.mode == "RGBA" else None)
        im = flat
    else:
        im = im.convert("RGB")

    # Resize if needed (and not from SVG which is already sized)
    if im.width != args.width and not tmp_png:
        h = round(im.height * args.width / im.width)
        im = im.resize((args.width, h), Image.LANCZOS)

    # Convert to numpy array
    rgb = np.asarray(im).astype(np.float64) / 255.0

    # Build mask
    mask = build_mask(rgb, args.mode, args.target_hex, args.luma_thr, args.sat_thr)

    # Report mask coverage
    pct = 100.0 * mask.mean()
    print(f"Glow mask covers {pct:.1f}% of pixels")

    if pct == 0:
        print("WARNING: mask is empty, output will be plain SDR")
    if pct > 90:
        print("WARNING: mask covers almost everything, this will just look bright")

    # Convert mask to float and optionally feather
    m = mask.astype(np.float64)

    if args.feather > 0:
        # Apply Gaussian blur to feather the edges
        m_img = Image.fromarray((m * 255).astype(np.uint8))
        m_img = m_img.filter(ImageFilter.GaussianBlur(args.feather))
        m = np.asarray(m_img).astype(np.float64) / 255.0

    # Pipeline: sRGB -> linear -> Rec2020 linear
    lin = srgb_to_linear(rgb)
    lin2020 = np.clip(lin @ SRGB_TO_REC2020.T, 0.0, None)

    # Compute per-pixel target peak luminance
    # Lerp between SDR and glow nits based on mask
    peak = args.sdr_nits + (args.glow_nits - args.sdr_nits) * m

    # Convert to absolute nits
    absolute = lin2020 * peak[..., None]

    # PQ encode
    out = pq_inverse_eotf(absolute)

    # Quantize to 8-bit
    out8 = np.clip(np.round(out * 255.0), 0, 255).astype(np.uint8)

    # Load ICC profile
    if not os.path.exists(args.icc):
        print(f"ICC profile not found at {args.icc}")
        print("Generate it first with:  python3 make_pq_icc.py")
        sys.exit(1)

    with open(args.icc, "rb") as f:
        icc = f.read()

    # Save JPEG with profile
    img_out = Image.fromarray(out8, "RGB")
    img_out.save(
        args.output, "JPEG",
        quality=args.quality,
        subsampling=0,  # No chroma subsampling for sharp edges
        icc_profile=icc,
    )

    file_size = os.path.getsize(args.output)
    print(f"Wrote {args.output} ({file_size} bytes, {len(icc)} byte profile)")

    # Verification: round-trip luminance check
    verify_luminance(args.output, mask, rgb, args.glow_nits, args.sdr_nits)

    # Clean up temp file if created
    if tmp_png:
        os.unlink(tmp_png)


def verify_luminance(output_path, mask, original_rgb, glow_nits, sdr_nits):
    """Verify that the encoded luminance matches expectations."""
    from PIL import ImageCms

    # Load the output image
    im = Image.open(output_path)

    # Verify ICC profile is present
    icc_info = im.info.get("icc_profile")
    if not icc_info:
        print("WARNING: No ICC profile found in output JPEG")
        return

    print(f"✓ ICC profile preserved ({len(icc_info)} bytes)")

    # Decode pixels back through PQ EOTF
    rgb_out = np.asarray(im).astype(np.float64) / 255.0

    # Assume the output is already in Rec2020 PQ
    # Decode through PQ EOTF to get absolute nits
    nits = pq_eotf(rgb_out)

    # Convert original to linear for comparison
    lin_orig = srgb_to_linear(original_rgb)

    # Check glow regions
    if mask.any():
        glow_nits_actual = nits[mask].mean()
        # The actual nits should be scaled by the original pixel brightness
        expected_glow = glow_nits * lin_orig[mask].mean()

        if abs(glow_nits_actual - expected_glow) / expected_glow < 0.2:
            print(f"✓ Glow region luminance: {glow_nits_actual:.1f} nits (expected ~{expected_glow:.1f})")
        else:
            print(f"⚠ Glow region luminance: {glow_nits_actual:.1f} nits (expected ~{expected_glow:.1f})")

    # Check non-glow regions
    non_mask = ~mask
    if non_mask.any():
        sdr_nits_actual = nits[non_mask].max()
        if sdr_nits_actual < sdr_nits * 1.5:
            print(f"✓ SDR region peak: {sdr_nits_actual:.1f} nits (target {sdr_nits:.1f})")
        else:
            print(f"⚠ SDR region peak: {sdr_nits_actual:.1f} nits (target {sdr_nits:.1f})")


if __name__ == "__main__":
    main()