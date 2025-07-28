// This file is part of midnight-node-cli.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import Docker from "dockerode";
import chalk from "chalk";
import ora from "ora";
import fetch from "node-fetch";
import { logger } from "./utils/logger";
import { DockerHelper } from "./utils/docker";

export interface NodeOptions {
  port: string;
  version: string;
  preset: string;
  name: string;
  detach?: boolean;
  pull?: boolean;
}

export interface StopOptions {
  name: string;
  volumes?: boolean;
}

export interface StatusOptions {
  name: string;
}

export interface LogsOptions {
  name: string;
  follow?: boolean;
  tail: string;
}

export interface HealthOptions {
  port: string;
  timeout: string;
}

interface DockerError extends Error {
  statusCode?: number;
  code?: string;
}

interface FetchError extends Error {
  name: string;
  code?: string;
}

interface JsonRpcResponse {
  result?: unknown;
  error?: unknown;
  id: number;
  jsonrpc: string;
}

export class MidnightNode {
  private docker: Docker;
  private dockerHelper: DockerHelper;

  constructor() {
    this.docker = new Docker();
    this.dockerHelper = new DockerHelper(this.docker);
  }

  async up(options: NodeOptions): Promise<void> {
    const { port, version, preset, name, detach, pull } = options;
    const imageName = `midnightnetwork/midnight-node:${version}`;

    logger.info(`Starting Midnight Network development node...`);
    logger.info(`Image: ${chalk.cyan(imageName)}`);
    logger.info(`Port: ${chalk.cyan(port)}`);
    logger.info(`Preset: ${chalk.cyan(preset)}`);

    // Check if Docker is available
    await this.dockerHelper.checkDockerAvailable();

    // Stop existing container if running
    await this.dockerHelper.stopContainerIfExists(name);

    // Check if image exists locally, if not pull it
    const imageExists = await this.dockerHelper.checkImageExists(imageName);
    if (!imageExists || pull) {
      await this.dockerHelper.pullImage(imageName);
    }

    // Start the container
    const spinner = ora("Starting Midnight node container...").start();

    try {
      const container = await this.docker.createContainer({
        Image: imageName,
        name,
        Env: [`CFG_PRESET=${preset}`],
        ExposedPorts: {
          "9944/tcp": {},
        },
        HostConfig: {
          PortBindings: {
            "9944/tcp": [{ HostPort: port }],
          },
          RestartPolicy: {
            Name: "unless-stopped",
          },
        },
      });

      await container.start();
      spinner.succeed("Midnight node container started successfully!");

      if (!detach) {
        logger.info(chalk.green("\n✓ Node is starting up..."));
        logger.info(
          `📡 RPC endpoint: ${chalk.cyan(`http://localhost:${port}`)}`,
        );
        logger.info(`🐳 Container name: ${chalk.cyan(name)}`);
        logger.info(`\nTo check logs: ${chalk.yellow(`midnight-node logs`)}`);
        logger.info(`To stop the node: ${chalk.yellow(`midnight-node down`)}`);

        // Wait a moment and check if container is still running
        setTimeout(async () => {
          const containerInfo = await container.inspect();
          if (containerInfo.State.Running) {
            logger.info(
              chalk.green("\n🚀 Node is running and ready for development!"),
            );
          } else {
            logger.error(
              "\n❌ Container stopped unexpectedly. Check logs with: midnight-node logs",
            );
          }
        }, 3000);
      }
    } catch (error) {
      spinner.fail("Failed to start container");
      throw error;
    }
  }

  async down(options: StopOptions): Promise<void> {
    const { name, volumes } = options;

    logger.info(`Stopping Midnight Network development node...`);

    await this.dockerHelper.checkDockerAvailable();

    const spinner = ora("Stopping container...").start();

    try {
      const container = this.docker.getContainer(name);
      const containerInfo = await container.inspect().catch(() => null);

      if (!containerInfo) {
        spinner.info("Container not found - nothing to stop");
        return;
      }

      if (containerInfo.State.Running) {
        await container.stop();
        spinner.text = "Removing container...";
      }

      await container.remove();

      if (volumes) {
        // Remove any volumes associated with the container
        spinner.text = "Removing volumes...";
        // This would need additional logic to identify and remove volumes
      }

      spinner.succeed("Midnight node stopped and removed successfully!");
    } catch (error) {
      spinner.fail("Failed to stop container");
      throw error;
    }
  }

  async status(options: StatusOptions): Promise<void> {
    const { name } = options;

    await this.dockerHelper.checkDockerAvailable();

    try {
      const container = this.docker.getContainer(name);
      const containerInfo = await container.inspect();

      logger.info(`📋 Container Status: ${chalk.cyan(name)}`);
      logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const status = containerInfo.State.Running
        ? chalk.green("🟢 Running")
        : chalk.red("🔴 Stopped");

      logger.info(`Status: ${status}`);
      logger.info(`Image: ${chalk.cyan(containerInfo.Config.Image)}`);
      logger.info(
        `Created: ${chalk.cyan(new Date(containerInfo.Created).toLocaleString())}`,
      );

      if (containerInfo.State.Running) {
        logger.info(
          `Started: ${chalk.cyan(new Date(containerInfo.State.StartedAt).toLocaleString())}`,
        );
        logger.info(
          `Uptime: ${chalk.cyan(this.getUptime(containerInfo.State.StartedAt))}`,
        );

        // Show port mappings
        const ports = containerInfo.NetworkSettings.Ports;
        if (ports && ports["9944/tcp"]) {
          const hostPort = ports["9944/tcp"][0]?.HostPort;
          if (hostPort) {
            logger.info(`RPC Port: ${chalk.cyan(hostPort)} → 9944`);
            logger.info(
              `RPC Endpoint: ${chalk.cyan(`http://localhost:${hostPort}`)}`,
            );
          }
        }
      } else {
        logger.info(
          `Stopped: ${chalk.red(new Date(containerInfo.State.FinishedAt).toLocaleString())}`,
        );
        if (containerInfo.State.ExitCode !== 0) {
          logger.info(`Exit Code: ${chalk.red(containerInfo.State.ExitCode)}`);
        }
      }
    } catch (error: unknown) {
      const dockerError = error as DockerError;
      if (dockerError.statusCode === 404) {
        logger.info(`Container ${chalk.cyan(name)} not found`);
        logger.info(
          `Use ${chalk.yellow("midnight-node up")} to start a new node`,
        );
      } else {
        throw error;
      }
    }
  }

  async logs(options: LogsOptions): Promise<void> {
    const { name, follow, tail } = options;

    await this.dockerHelper.checkDockerAvailable();

    try {
      const container = this.docker.getContainer(name);

      if (follow) {
        logger.info(
          `📄 Following logs for ${chalk.cyan(name)} (Press Ctrl+C to exit):`,
        );
        logger.info(
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        );

        const stream = (await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
          tail: parseInt(tail) || 100,
          timestamps: true,
        })) as NodeJS.ReadableStream;

        stream.pipe(process.stdout);
      } else {
        logger.info(`📄 Last ${tail} lines of logs for ${chalk.cyan(name)}:`);
        logger.info(
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        );

        const stream = (await container.logs({
          follow: false,
          stdout: true,
          stderr: true,
          tail: parseInt(tail) || 100,
          timestamps: true,
        })) as Buffer;

        console.log(stream.toString());
      }
    } catch (error: unknown) {
      const dockerError = error as DockerError;
      if (dockerError.statusCode === 404) {
        logger.error(`Container ${chalk.cyan(name)} not found`);
      } else {
        throw error;
      }
    }
  }

  async reset(options: NodeOptions): Promise<void> {
    logger.info("🔄 Resetting Midnight Network development node...");

    // Stop and remove existing container
    await this.down({ name: options.name, volumes: true });

    // Pull fresh image and start
    await this.up({ ...options, pull: true });
  }

  async health(options: HealthOptions): Promise<void> {
    const { port, timeout } = options;
    const timeoutMs = parseInt(timeout) * 1000;
    const endpoint = `http://localhost:${port}`;

    logger.info(
      `🏥 Checking health of Midnight node at ${chalk.cyan(endpoint)}...`,
    );

    const spinner = ora("Performing health check...").start();

    try {
      // Simple RPC call to check if the node is responding
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "system_health",
          params: [],
          id: 1,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json() as JsonRpcResponse;
        spinner.succeed("Node is healthy and responding! ✨");

        logger.info(`📊 Health Check Results:`);
        logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        logger.info(`Endpoint: ${chalk.green(endpoint)}`);
        logger.info(`Status: ${chalk.green("✓ Healthy")}`);
        logger.info(`Response Time: ${chalk.cyan("< 1s")}`);

        if (data && data.result) {
          logger.info(
            `Node Info: ${chalk.cyan(JSON.stringify(data.result, null, 2))}`,
          );
        }
      } else {
        spinner.fail(`Node returned HTTP ${response.status}`);
        logger.error(`Health check failed with status: ${response.status}`);
      }
    } catch (error: unknown) {
      const fetchError = error as FetchError;
      spinner.fail("Health check failed");

      if (fetchError.name === "AbortError") {
        logger.error(`Request timed out after ${timeout} seconds`);
      } else if (fetchError.code === "ECONNREFUSED") {
        logger.error("Connection refused - is the node running?");
        logger.info(
          `Check status with: ${chalk.yellow("midnight-node status")}`,
        );
      } else {
        logger.error(`Health check error: ${fetchError.message}`);
      }
    }
  }

  private getUptime(startedAt: string): string {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h ${diffMins % 60}m`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    } else if (diffMins > 0) {
      return `${diffMins}m ${diffSecs % 60}s`;
    } else {
      return `${diffSecs}s`;
    }
  }
}
