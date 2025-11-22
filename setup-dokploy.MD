# Setup Dokploy

## Prerequisites
- **A Ubuntu Server**: A Preconfigured Ubuntu Server with Access to it. Need help? Check out [Setup Ubuntu Server](setup-ubuntu-server.MD).


## Step 1: Install Dokploy
1. Update your system:
```bash
sudo apt update && sudo apt upgrade -y
```
2. Install Dokploy:
```bash
curl -sSL https://dokploy.com/install.sh | sh
```
3. Access Dokploy at `http://your-ip-from-your-vps:3000`.

## Step 2: Initial Configuration

Create an Admin Account: Fill in the necessary details to set up your administrator account. This account will be the admin account for Dokploy.
 <img src="./dokploy-setup.png" alt="Dokploy Setup" width="90%"/>