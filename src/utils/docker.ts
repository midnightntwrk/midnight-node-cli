// This file is part of midnight-node-cli.
// Copyright (C) 2025-2026 Midnight Foundation
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
import ora from "ora";
import chalk from "chalk";
import { logger } from "./logger";

interface DockerError extends Error {
  statusCode?: number;
  code?: string;
}

export class DockerHelper {
  constructor(private docker: Docker) {}

  async checkDockerAvailable(): Promise<void> {
    try {
      await this.docker.ping();
    } catch {
      logger.error("Docker is not available or not running");
      logger.info("Please make sure Docker is installed and running");
      logger.info(
        "Visit https://docs.docker.com/get-docker/ for installation instructions",
      );
      throw new Error("Docker not available");
    }
  }

  async checkImageExists(imageName: string): Promise<boolean> {
    try {
      await this.docker.getImage(imageName).inspect();
      return true;
    } catch (error: unknown) {
      const dockerError = error as DockerError;
      if (dockerError.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async pullImage(imageName: string): Promise<void> {
    const spinner = ora(
      `Pulling Docker image: ${chalk.cyan(imageName)}`,
    ).start();

    try {
      const stream = await this.docker.pull(imageName);

      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(
          stream,
          (err, res) => {
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
          },
          (event) => {
            if (event.status && event.progress) {
              spinner.text = `Pulling ${chalk.cyan(imageName)}: ${event.status} ${event.progress}`;
            } else if (event.status) {
              spinner.text = `Pulling ${chalk.cyan(imageName)}: ${event.status}`;
            }
          },
        );
      });

      spinner.succeed(`Successfully pulled ${chalk.cyan(imageName)}`);
    } catch (error: unknown) {
      const dockerError = error as DockerError;
      spinner.fail(`Failed to pull image: ${chalk.red(imageName)}`);

      // Provide more helpful error messages
      if (dockerError.statusCode === 404) {
        logger.error(`Image not found: ${chalk.red(imageName)}`);
        logger.info("Please check the image name and version are correct");
        logger.info(
          "Available versions might be listed at: https://hub.docker.com/r/midnightnetwork/midnight-node/tags",
        );
      } else if (
        dockerError.code === "ENOTFOUND" ||
        dockerError.code === "ECONNREFUSED"
      ) {
        logger.error(
          "Network error: Unable to connect to the container registry",
        );
        logger.info("Please check your internet connection and try again");
      } else {
        logger.error(`Pull error: ${dockerError.message}`);
      }

      throw error;
    }
  }

  async stopContainerIfExists(containerName: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerName);
      const containerInfo = await container.inspect();

      if (containerInfo.State.Running) {
        logger.info(
          `Stopping existing container: ${chalk.cyan(containerName)}`,
        );
        await container.stop();
      }

      logger.info(`Removing existing container: ${chalk.cyan(containerName)}`);
      await container.remove();
    } catch (error: unknown) {
      const dockerError = error as DockerError;
      // Container doesn't exist, which is fine
      if (dockerError.statusCode !== 404) {
        throw error;
      }
    }
  }

  async getContainerLogs(
    containerName: string,
    options: { follow?: boolean; tail?: number } = {},
  ): Promise<NodeJS.ReadableStream | Buffer> {
    const container = this.docker.getContainer(containerName);

    if (options.follow) {
      return (await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: options.tail || 100,
        timestamps: true,
      })) as NodeJS.ReadableStream;
    } else {
      return (await container.logs({
        follow: false,
        stdout: true,
        stderr: true,
        tail: options.tail || 100,
        timestamps: true,
      })) as Buffer;
    }
  }

  async isContainerRunning(containerName: string): Promise<boolean> {
    try {
      const container = this.docker.getContainer(containerName);
      const containerInfo = await container.inspect();
      return containerInfo.State.Running;
    } catch (error: unknown) {
      const dockerError = error as DockerError;
      if (dockerError.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async waitForContainer(
    containerName: string,
    maxWaitTime = 30000,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      if (await this.isContainerRunning(containerName)) {
        return true;
      }
      await this.sleep(1000);
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
