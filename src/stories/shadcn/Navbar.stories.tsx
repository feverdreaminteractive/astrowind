import React from "react";
import type { Meta, StoryObj } from '@storybook/react';
import { Navbar, NavbarBrand, NavbarContent, NavbarActions } from '@/components/ui/navbar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MenuIcon, ZapIcon } from 'lucide-react';

const meta = {
  title: 'Shadcn/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Navbar>
      <NavbarBrand>
        <ZapIcon className="size-5" />
        Acme Inc
      </NavbarBrand>
      <NavbarContent>
        <a href="#" className="hover:text-foreground">Home</a>
        <a href="#" className="hover:text-foreground">Products</a>
        <a href="#" className="hover:text-foreground">Pricing</a>
        <a href="#" className="hover:text-foreground">About</a>
      </NavbarContent>
      <NavbarActions>
        <Button variant="ghost" size="sm">Sign in</Button>
        <Button size="sm">Get started</Button>
      </NavbarActions>
    </Navbar>
  ),
};

export const WithMobileMenu: Story = {
  render: () => (
    <Navbar>
      <NavbarBrand>
        <ZapIcon className="size-5" />
        Acme Inc
      </NavbarBrand>
      <NavbarContent>
        <a href="#" className="hover:text-foreground">Home</a>
        <a href="#" className="hover:text-foreground">Products</a>
        <a href="#" className="hover:text-foreground">Pricing</a>
      </NavbarContent>
      <NavbarActions>
        <Button size="sm" className="hidden md:inline-flex">Get started</Button>
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="md:hidden" />
            }
          >
            <MenuIcon />
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </NavbarActions>
    </Navbar>
  ),
};
