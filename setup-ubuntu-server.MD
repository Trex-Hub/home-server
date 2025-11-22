# Setup Ubuntu Server

## Prerequisites
- **Spare Hardware**: A spare Computer or Laptop with at least 4GB of RAM, 128GB of Storage, and a Quad Core CPU.
- **Pendrive**: A Pendrive with at least 8GB of Storage.
- **Home Network**: A Simple Home Network with a Router atleast.


## Step 1: Create a Bootable Pendrive
1. Download the latest version of Ubuntu Server ISO from the [official website](https://ubuntu.com/server/download).
2. Use [balenaEtcher](https://etcher.balena.io/) to flash the ISO to your pendrive.

## Step 2: BIOS Configuration
1. Insert the bootable pendrive into the server hardware.
2. Enter the BIOS settings of the computer.
3. **Disable all other boot drives** to ensure the system boots from the pendrive and avoids confusion during installation.

## Step 3: Installation
1. Follow the generic steps to install Ubuntu Server.
2. **SSH Setup**: When prompted, choose to import SSH keys from GitHub. This allows for seamless login later.
3. **Profile Setup**: Create a root profile and a common user profile as required.

## Step 4: Post-Installation
1. Once installed, leave the server powered on.
2. Assign a **Static IP** to the server within your local network (usually done via your Router's DHCP reservation settings).

## References
- [Setup Ubuntu Server](https://youtu.be/K2m52F0S2w8?si=wqLX1-QfLA9N_d3W)