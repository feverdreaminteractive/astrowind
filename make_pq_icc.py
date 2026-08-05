#!/usr/bin/env python3
"""Generate a Rec.2020 gamut + PQ (SMPTE ST 2084) transfer ICC v4.4 profile."""
import struct
import hashlib
import math

# PQ EOTF constants (SMPTE ST 2084)
M1 = 2610 / 16384
M2 = 2523 / 4096 * 128
C1 = 3424 / 4096
C2 = 2413 / 4096 * 32
C3 = 2392 / 4096 * 32


def pq_eotf(v):
    """PQ code value [0,1] -> absolute luminance in nits."""
    v = max(v, 0.0)
    v_pow = v ** (1 / M2)
    num = max(v_pow - C1, 0.0)
    den = C2 - C3 * v_pow
    if den <= 0:
        return 10000.0
    return 10000.0 * (num / den) ** (1 / M1)


def xy_to_XYZ(x, y, Y=1.0):
    """Convert xy chromaticity to XYZ."""
    return (Y * x / y, Y, Y * (1 - x - y) / y)


# Rec.2020 primaries and D65 white point
REC2020_PRIM = {
    "r": (0.708, 0.292),
    "g": (0.170, 0.797),
    "b": (0.131, 0.046)
}
D65 = (0.3127, 0.3290)
D50_XYZ = (0.9642, 1.0000, 0.8249)

# Bradford chromatic adaptation matrix
BRADFORD = [
    [0.8951, 0.2664, -0.1614],
    [-0.7502, 1.7135, 0.0367],
    [0.0389, -0.0685, 1.0296]
]


def mat_mul(A, B):
    """Matrix multiplication."""
    return [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def mat_vec(A, v):
    """Matrix-vector multiplication."""
    return [sum(A[i][k] * v[k] for k in range(3)) for i in range(3)]


def mat_inv(M):
    """3x3 matrix inversion."""
    a, b, c = M[0]
    d, e, f = M[1]
    g, h, i = M[2]
    det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
    return [
        [(e*i-f*h)/det, (c*h-b*i)/det, (b*f-c*e)/det],
        [(f*g-d*i)/det, (a*i-c*g)/det, (c*d-a*f)/det],
        [(d*h-e*g)/det, (b*g-a*h)/det, (a*e-b*d)/det]
    ]


def bradford_adapt(src_XYZ, dst_XYZ):
    """Compute Bradford adaptation matrix from src to dst white point."""
    s = mat_vec(BRADFORD, list(src_XYZ))
    d = mat_vec(BRADFORD, list(dst_XYZ))
    D = [[d[0]/s[0], 0, 0], [0, d[1]/s[1], 0], [0, 0, d[2]/s[2]]]
    return mat_mul(mat_inv(BRADFORD), mat_mul(D, BRADFORD))


def compute_primaries_d50():
    """Compute Rec.2020 primaries adapted to D50."""
    D65_XYZ = xy_to_XYZ(*D65)
    adapt = bradford_adapt(D65_XYZ, D50_XYZ)

    primaries = {}
    for name, xy in REC2020_PRIM.items():
        XYZ_D65 = xy_to_XYZ(*xy)
        XYZ_D50 = mat_vec(adapt, XYZ_D65)
        # Clamp negative Z (happens with red primary)
        XYZ_D50[2] = max(0.0, XYZ_D50[2])
        primaries[name] = XYZ_D50

    return primaries, adapt


def s15f16(x):
    """Convert float to s15Fixed16Number."""
    return struct.pack(">i", int(round(x * 65536.0)))


def u16(x):
    """Pack unsigned 16-bit integer."""
    return struct.pack(">H", x)


def u32(x):
    """Pack unsigned 32-bit integer."""
    return struct.pack(">I", x)


def pad4(b):
    """Pad bytes to 4-byte alignment."""
    pad_len = (4 - len(b) % 4) % 4
    return b + b"\x00" * pad_len


def tag_XYZ(X, Y, Z):
    """Create XYZ tag."""
    return b"XYZ " + b"\x00" * 4 + s15f16(X) + s15f16(Y) + s15f16(Z)


def tag_mluc(text):
    """Create multiLocalizedUnicode tag."""
    # Single English entry
    text_utf16 = text.encode("utf-16-be")
    data = b"mluc" + b"\x00" * 4  # signature + reserved
    data += u32(1)  # number of records
    data += u32(12)  # record size
    data += b"enUS"  # language-country
    data += u32(len(text_utf16))  # string length
    data += u32(28)  # string offset (after header)
    data += text_utf16
    return pad4(data)


def tag_curv(n_entries, func):
    """Create curve tag with n_entries samples of func."""
    data = b"curv" + b"\x00" * 4
    data += u32(n_entries)
    for i in range(n_entries):
        x = i / (n_entries - 1) if n_entries > 1 else 0.0
        y = func(x)
        # Normalize to [0, 65535]
        y = max(0.0, min(1.0, y))
        data += u16(int(round(y * 65535)))
    return data


def tag_cicp(primaries, transfer, matrix, range_):
    """Create CICP tag (ColorimetryInfoChunkProfile)."""
    data = b"cicp"
    data += b"\x00" * 4  # reserved
    data += bytes([primaries, transfer, matrix, range_])
    return pad4(data)


def tag_chad(matrix):
    """Create chromaticAdaptation tag."""
    data = b"sf32" + b"\x00" * 4
    # Flatten matrix and convert to s15Fixed16
    for row in matrix:
        for val in row:
            data += s15f16(val)
    return data


def create_pq_icc():
    """Create the complete ICC profile."""
    # Compute adapted primaries and adaptation matrix
    primaries_d50, adapt_matrix = compute_primaries_d50()

    # Build tags
    tags = {}

    # Required tags
    tags["desc"] = tag_mluc("Rec2020 Gamut with PQ Transfer")
    tags["cprt"] = tag_mluc("No copyright")
    tags["wtpt"] = tag_XYZ(*D50_XYZ)
    tags["chad"] = tag_chad(adapt_matrix)

    # Colorant tags (primaries)
    tags["rXYZ"] = tag_XYZ(*primaries_d50["r"])
    tags["gXYZ"] = tag_XYZ(*primaries_d50["g"])
    tags["bXYZ"] = tag_XYZ(*primaries_d50["b"])

    # TRC curves - PQ EOTF normalized to [0,1]
    def pq_normalized(x):
        # x is [0,1] code value, return normalized EOTF output
        return pq_eotf(x) / 10000.0

    trc_data = tag_curv(4096, pq_normalized)
    # All three channels use the same curve, so we'll dedupe them

    # CICP tag - the critical one for HDR
    tags["cicp"] = tag_cicp(9, 16, 0, 1)  # Rec2020, PQ, RGB, full range

    # Build tag table
    tag_table = []
    tag_data = b""
    data_offset = 132 + len(tags) * 12 + 12  # header + tag table + TRC entries

    # Add TRC tags (deduped to same offset)
    trc_offset = data_offset
    tag_table.append((b"rTRC", trc_offset, len(trc_data)))
    tag_table.append((b"gTRC", trc_offset, len(trc_data)))
    tag_table.append((b"bTRC", trc_offset, len(trc_data)))
    tag_data += trc_data
    data_offset += len(trc_data)

    # Add other tags
    for sig, data in tags.items():
        tag_table.append((sig.encode("ascii")[:4].ljust(4), data_offset, len(data)))
        tag_data += data
        data_offset += len(data)

    # Build header
    header = b""
    header += u32(128 + len(tag_table) * 12 + 4 + len(tag_data))  # profile size
    header += b"APPL"  # preferred CMM type (Apple)
    header += u32(0x04400000)  # version 4.4.0
    header += b"mntr"  # profile class: monitor
    header += b"RGB "  # color space
    header += b"XYZ "  # PCS
    header += b"\x00" * 12  # creation date/time (zeros)
    header += b"acsp"  # profile signature
    header += b"APPL"  # primary platform (Apple)
    header += b"\x00" * 4  # profile flags
    header += b"\x00" * 8  # device manufacturer and model
    header += b"\x00" * 8  # device attributes
    header += u32(0)  # rendering intent: perceptual
    header += s15f16(0.9642) + s15f16(1.0) + s15f16(0.8249)  # PCS illuminant (D50)
    header += b"APPL"  # profile creator
    header += b"\x00" * 16  # profile ID (will be computed)
    header += b"\x00" * 28  # reserved

    # Build complete profile
    profile = header
    profile += u32(len(tag_table))  # tag count

    # Write tag table
    for sig, offset, size in tag_table:
        profile += sig
        profile += u32(offset)
        profile += u32(size)

    profile += tag_data

    # Compute profile ID (MD5 with specific bytes zeroed)
    id_data = bytearray(profile)
    # Zero out: size (44-48), CMM (64-68), and ID field itself (84-100)
    id_data[44:48] = b"\x00" * 4
    id_data[64:68] = b"\x00" * 4
    id_data[84:100] = b"\x00" * 16
    profile_id = hashlib.md5(id_data).digest()

    # Insert profile ID
    profile = profile[:84] + profile_id + profile[100:]

    return profile


def verify_profile(profile_bytes):
    """Verify the generated profile."""
    from PIL import ImageCms
    import io

    # Parse with Pillow
    try:
        profile = ImageCms.getOpenProfile(io.BytesIO(profile_bytes))
        print(f"✓ Profile parsed successfully")

        # Check version directly from bytes
        version = struct.unpack(">I", profile_bytes[8:12])[0]
        version_str = f"{(version >> 24) & 0xFF}.{(version >> 20) & 0xF}.{(version >> 16) & 0xF}"
        print(f"✓ Version: {version_str}")
        assert version == 0x04400000, f"Version should be 4.4.0, got {version_str}"

        # Verify we have CICP tag
        assert b"cicp" in profile_bytes, "CICP tag not found"
        print("✓ CICP tag present")

        # Extract and verify red primary from rXYZ tag
        # Find rXYZ tag in the profile
        tag_count_offset = 128
        tag_count = struct.unpack(">I", profile_bytes[tag_count_offset:tag_count_offset+4])[0]

        for i in range(tag_count):
            tag_offset = 132 + i * 12
            tag_sig = profile_bytes[tag_offset:tag_offset+4]
            if tag_sig == b"rXYZ":
                data_offset = struct.unpack(">I", profile_bytes[tag_offset+4:tag_offset+8])[0]
                # Skip signature and reserved
                xyz_offset = data_offset + 8
                X = struct.unpack(">i", profile_bytes[xyz_offset:xyz_offset+4])[0] / 65536.0
                Y = struct.unpack(">i", profile_bytes[xyz_offset+4:xyz_offset+8])[0] / 65536.0
                Z = struct.unpack(">i", profile_bytes[xyz_offset+8:xyz_offset+12])[0] / 65536.0
                # Convert to xy chromaticity
                sum_xyz = X + Y + Z
                if sum_xyz > 0:
                    x = X / sum_xyz
                    y = Y / sum_xyz
                    print(f"✓ Red primary at xy ({x:.3f}, {y:.3f}) - close to Rec2020 spec (0.708, 0.292)")
                    # Allow some tolerance due to D50 adaptation
                    assert abs(x - 0.707) < 0.01, f"Red x should be near 0.707, got {x:.3f}"
                    assert abs(y - 0.293) < 0.01, f"Red y should be near 0.293, got {y:.3f}"
                break

        print("✓ Profile verification complete")

    except Exception as e:
        print(f"✗ Profile verification failed: {e}")
        raise


def main():
    """Generate and save the ICC profile."""
    profile = create_pq_icc()

    output_path = "Rec2020-PQ.icc"
    with open(output_path, "wb") as f:
        f.write(profile)

    print(f"Generated {output_path} ({len(profile)} bytes)")

    # Verify the profile
    verify_profile(profile)


if __name__ == "__main__":
    main()