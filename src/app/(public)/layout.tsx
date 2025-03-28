import React from 'react';
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/navbar';
import {
  Sidebar,
  SidebarBody,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/components/sidebar';
import { SidebarLayout } from '@/components/sidebar-layout';
import { HomeIcon, InformationCircleIcon, EnvelopeIcon } from '@heroicons/react/20/solid';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
          <NavbarSection>
            <NavbarItem href="/contact" aria-label="Contact">
              <EnvelopeIcon />
            </NavbarItem>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <SidebarSection>
              <SidebarItem href="/">
                <HomeIcon />
                <SidebarLabel>Home</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              <SidebarItem href="/about">
                <InformationCircleIcon />
                <SidebarLabel>About</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/contact">
                <EnvelopeIcon />
                <SidebarLabel>Contact</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarBody>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
