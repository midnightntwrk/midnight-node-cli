# Midnight Network Node CLI

A CLI tool for easily running Midnight Network development nodes.

## Quick Start

```bash
# Install globally
npm install -g @midnight-ntwrk/midnight-node

# Or run directly with npx
npx @midnight-ntwrk/midnight-node up
```

## Features

- 🚀 **Easy setup**: Start a Midnight development node with a single command
- 🐳 **Docker-based**: Uses official Midnight Network Docker images
- 📊 **Node management**: Start, stop, reset, and monitor your development node
- 🏥 **Health checks**: Verify your node is running and responding
- 📄 **Log streaming**: View real-time logs from your development node
- ⚙️ **Configurable**: Customize ports, versions, and presets

## Commands

### `up` - Start a development node

Start a new Midnight Network development node:

```bash
midnight-node up
```

Options:

- `-p, --port <port>`: Port to expose the node on (default: 9944)
- `-v, --version <version>`: Midnight node version (default: 0.12.1)
- `--preset <preset>`: Configuration preset (default: dev)
- `--name <n>`: Container name (default: midnight-dev-node)
- `--detach`: Run container in detached mode
- `--pull`: Pull latest image before starting

Examples:

```bash
# Start with default settings
midnight-node up

# Start on custom port with specific version
midnight-node up -p 8944 -v 0.12.0

# Pull fresh image and start in detached mode
midnight-node up --pull --detach
```

### `down` - Stop the development node

Stop and remove the running development node:

```bash
midnight-node down
```

Options:

- `--name <n>`: Container name (default: midnight-dev-node)
- `--volumes`: Remove volumes as well

### `status` - Check node status

Check the current status of your development node:

```bash
midnight-node status
```

This will show:

- Container running state
- Docker image information
- Start time and uptime
- Port mappings
- RPC endpoint URL

### `logs` - View node logs

View logs from the development node:

```bash
midnight-node logs
```

Options:

- `--name <n>`: Container name (default: midnight-dev-node)
- `-f, --follow`: Follow log output in real-time
- `--tail <lines>`: Number of lines to show from the end of logs (default: 100)

Examples:

```bash
# View last 100 lines
midnight-node logs

# Follow logs in real-time
midnight-node logs -f

# View last 500 lines
midnight-node logs --tail 500
```

### `reset` - Reset the development node

Stop, remove, pull fresh image, and start the development node:

```bash
midnight-node reset
```

This is equivalent to running `down`, then `up --pull`.

### `health` - Check node health

Perform a health check on the running node:

```bash
midnight-node health
```

Options:

- `--port <port>`: Port the node is running on (default: 9944)
- `--timeout <timeout>`: Health check timeout in seconds (default: 30)

## Requirements

- **Docker**: Make sure Docker is installed and running
- **Node.js**: Version 16 or higher

## Installation

### Global Installation

```bash
npm install -g @midnight-ntwrk/midnight-node
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/midnight-ntwrk/midnight-node.git
cd midnight-node

# Install dependencies
npm install

# Build the project
npm run build

# Run locally
npm run dev up
```

## Configuration

The tool uses the official Midnight Network Docker image:

```
midnightnetwork/midnight-node:0.12.1
```

Default configuration:

- **Port**: 9944 (RPC endpoint)
- **Preset**: dev (development configuration)
- **Container name**: midnight-dev-node

## Development Workflow

1. **Start your development environment**:

   ```bash
   midnight-node up
   ```

2. **Check that everything is running**:

   ```bash
   midnight-node status
   midnight-node health
   ```

3. **Your RPC endpoint is ready**:

   ```
   http://localhost:9944
   ```

4. **View logs if needed**:

   ```bash
   midnight-node logs -f
   ```

5. **When you're done developing**:
   ```bash
   midnight-node down
   ```

## Troubleshooting

### Docker Issues

If you get Docker-related errors:

1. Make sure Docker is installed and running
2. Check that you have permission to run Docker commands
3. On Linux, you might need to add your user to the docker group:
   ```bash
   sudo usermod -aG docker $USER
   ```

### Port Conflicts

If port 9944 is already in use:

```bash
# Use a different port
midnight-node up -p 8944
```

### Container Issues

If the container fails to start:

```bash
# Check logs for errors
midnight-node logs

# Try resetting with a fresh image
midnight-node reset
```

### Node Not Responding

If health checks fail:

```bash
# Check if container is running
midnight-node status

# View recent logs
midnight-node logs --tail 50

# Try restarting
midnight-node reset
```

## Examples

### Basic Development Setup

```bash
# Start development node
midnight-node up

# In another terminal, check status
midnight-node status

# Test RPC connection
curl -X POST http://localhost:9944 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"system_health","params":[],"id":1}'
```

### Custom Configuration

```bash
# Start on port 8944 with specific version
midnight-node up -p 8944 -v 0.11.0

# Reset with custom settings
midnight-node reset -p 8944 -v 0.12.1
```

### Monitoring and Debugging

```bash
# Follow logs in real-time
midnight-node logs -f

# Check health with custom timeout
midnight-node health --timeout 60

# View container details
midnight-node status
```

## Support

- [GitHub Issues](https://github.com/midnight-ntwrk/midnight-node/issues)
- [Midnight Network Documentation](https://docs.midnight.network/)
- [Discord Community](https://discord.gg/midnight)
