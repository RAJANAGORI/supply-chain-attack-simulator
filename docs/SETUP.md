# Complete Setup Guide

This guide will walk you through setting up the Supply Chain Attack Testbench on your local machine.

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Starting Services](#starting-services)
5. [Verifying Installation](#verifying-installation)
6. [Troubleshooting](#troubleshooting)

## System Requirements

### Required Software

- **Node.js**: Version 16 or higher
- **npm**: Version 7 or higher (comes with Node.js)
- **Git**: For cloning the repository

### Optional Software

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher

### Supported Operating Systems

- macOS 10.15+
- Linux (Ubuntu 20.04+, Debian 11+, Fedora 35+)
- Windows 10/11 with WSL2

### Hardware Requirements

- **RAM**: Minimum 4GB, recommended 8GB
- **Disk Space**: Minimum 2GB free space
- **CPU**: Any modern dual-core processor

## Installation

### Step 1: Install Prerequisites

#### macOS

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install Docker (optional)
brew install --cask docker
```

#### Ubuntu/Debian Linux

```bash
# Update package list
sudo apt update

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker (optional)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

#### Windows (WSL2)

```bash
# Install WSL2 first (PowerShell as Administrator)
wsl --install

# Inside WSL2 Ubuntu, follow Ubuntu installation steps above
```

### Step 2: Clone Repository

```bash
git clone <repository-url>
cd testbench
```

### Step 3: Run Setup Script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The setup script will:
- Check system requirements
- Install dependencies
- Configure environment variables
- Create necessary directories
- Start Docker services (if available)

## Configuration

### Environment Variables

Add the following to your shell configuration (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# Enable testbench mode
export TESTBENCH_MODE=enabled
```

Apply changes:

```bash
source ~/.bashrc  # or ~/.zshrc
```

### Docker Configuration

If using Docker, the services are configured via `docker/docker-compose.yml`:

- **Mock Server**: Port 3000
- **Dashboard**: Port 8080
- **Private Registry**: Port 4873
- **Public Registry**: Port 4874

To customize ports, edit `docker/docker-compose.yml`.

### NPM Configuration

For dependency confusion scenarios, configure npm registry scopes.

Create `.npmrc` in project root:

```bash
# Private packages from private registry
@yourcompany:registry=http://localhost:4873/

# Public packages from public registry  
registry=https://registry.npmjs.org/
```

## Starting Services

### Using Docker (Recommended)

```bash
cd docker
docker-compose up -d
```

Verify services are running:

```bash
docker-compose ps
```

### Manual Startup (Without Docker)

#### Start Mock Server

```bash
cd scenarios/01-typosquatting/infrastructure
node mock-server.js &
```

#### Start Dashboard

```bash
cd docker/dashboard
npm install
node server.js &
```

#### Start Verdaccio Registries

```bash
# Private registry
npx verdaccio -c docker/verdaccio/private-config.yaml -l 4873 &

# Public registry
npx verdaccio -c docker/verdaccio/public-config.yaml -l 4874 &
```

## Verifying Installation

### Check Services

1. **Mock Server**: http://localhost:3000/captured-data
   - Should return: `{"captures": []}`

2. **Dashboard**: http://localhost:8080
   - Should display the testbench dashboard

3. **Private Registry**: http://localhost:4873
   - Should show Verdaccio web interface

4. **Public Registry**: http://localhost:4874
   - Should show Verdaccio web interface

### Run Test Scenario

```bash
cd scenarios/01-typosquatting
./setup.sh
cd victim-app
npm install ../malicious-packages/request-lib
npm start
```

Check mock server for captured data:

```bash
curl http://localhost:3000/captured-data
```

If you see captured data, the installation is successful!

## Troubleshooting

### Issue: "TESTBENCH_MODE not enabled"

**Solution**:
```bash
export TESTBENCH_MODE=enabled
```

Add to shell config for persistence.

### Issue: "Port already in use"

**Solution**:
```bash
# Find process using the port
lsof -i :3000  # or :8080, :4873, :4874

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
```

### Issue: "Docker services won't start"

**Solution**:
```bash
# Check Docker is running
docker ps

# Check logs
docker-compose logs

# Restart services
docker-compose down
docker-compose up -d
```

### Issue: "npm install fails"

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Issue: "Permission denied" on scripts

**Solution**:
```bash
# Make scripts executable
chmod +x scripts/*.sh
chmod +x scenarios/*/setup.sh
chmod +x detection-tools/*.sh
```

### Issue: "Mock server not receiving data"

**Solution**:
1. Verify mock server is running: `curl http://localhost:3000/captured-data`
2. Check TESTBENCH_MODE is enabled: `echo $TESTBENCH_MODE`
3. Review application logs for network errors
4. Check firewall settings aren't blocking localhost connections

### Issue: "Cannot find module"

**Solution**:
```bash
# Install dependencies in each scenario
cd scenarios/01-typosquatting/victim-app
npm install

cd ../../02-dependency-confusion/corporate-app
npm install

# Repeat for each scenario
```

## Advanced Configuration

### Custom Mock Server Port

Edit `scenarios/01-typosquatting/infrastructure/mock-server.js`:

```javascript
const PORT = 3001; // Change from 3000
```

Update malicious package templates to use new port.

### Enable Debug Logging

```bash
export DEBUG=testbench:*
export NODE_ENV=development
```

### Custom Registry Configuration

Edit `docker/verdaccio/private-config.yaml` or `public-config.yaml` for registry customization.

## Security Notes

⚠️ **IMPORTANT**: This testbench contains intentionally vulnerable code.

- **Never** deploy to production environments
- **Never** expose services to public internet
- **Always** use in isolated environments
- **Always** set `TESTBENCH_MODE=enabled`

## Next Steps

After successful installation:

1. Read the main [README.md](../README.md)
2. Complete [Scenario 1: Typosquatting](../scenarios/01-typosquatting/README.md)
3. Review [Best Practices](BEST_PRACTICES.md)
4. Learn about [Detection Tools](DETECTION_TOOLS.md)

## Getting Help

- Check [Troubleshooting Guide](TROUBLESHOOTING.md)
- Review scenario-specific README files
- Open an issue on GitHub
- Check FAQ in documentation

---

**Happy Learning!** 🔐

