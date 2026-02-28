#!/usr/bin/env node

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

import { Command } from "commander";
import chalk from "chalk";
import { MidnightNode } from "./node";
import { logger } from "./utils/logger";

const program = new Command();

program
  .name("midnight-node")
  .description("CLI tool for running Midnight Network development nodes")
  .version("1.0.0");

program
  .command("up")
  .description("Start a Midnight Network development node")
  .option("-p, --port <port>", "Port to expose the node on", "9944")
  .option("-v, --version <version>", "Midnight node version", "0.12.1")
  .option("--preset <preset>", "Configuration preset", "dev")
  .option("--name <name>", "Container name", "midnight-dev-node")
  .option("--detach", "Run container in detached mode", false)
  .option("--pull", "Pull latest image before starting", false)
  .action(async (options) => {
    try {
      const midnightNode = new MidnightNode();
      await midnightNode.up(options);
    } catch (error) {
      logger.error("Failed to start node:", error);
      process.exit(1);
    }
  });

program
  .command("down")
  .description("Stop and remove the Midnight Network development node")
  .option("--name <name>", "Container name", "midnight-dev-node")
  .option("--volumes", "Remove volumes as well", false)
  .action(async (options) => {
    try {
      const midnightNode = new MidnightNode();
      await midnightNode.down(options);
    } catch (error) {
      logger.error("Failed to stop node:", error);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Check the status of the Midnight Network development node")
  .option("--name <name>", "Container name", "midnight-dev-node")
  .action(async (options) => {
    try {
      const midnightNode = new MidnightNode();
      await midnightNode.status(options);
    } catch (error) {
      logger.error("Failed to check status:", error);
      process.exit(1);
    }
  });

program
  .command("logs")
  .description("View logs from the Midnight Network development node")
  .option("--name <name>", "Container name", "midnight-dev-node")
  .option("-f, --follow", "Follow log output", false)
  .option(
    "--tail <lines>",
    "Number of lines to show from the end of logs",
    "100",
  )
  .action(async (options) => {
    try {
      const midnightNode = new MidnightNode();
      await midnightNode.logs(options);
    } catch (error) {
      logger.error("Failed to get logs:", error);
      process.exit(1);
    }
  });

program
  .command("reset")
  .description(
    "Reset the development node (stop, remove, pull fresh image, and start)",
  )
  .option("-p, --port <port>", "Port to expose the node on", "9944")
  .option("-v, --version <version>", "Midnight node version", "0.12.1")
  .option("--preset <preset>", "Configuration preset", "dev")
  .option("--name <name>", "Container name", "midnight-dev-node")
  .action(async (options) => {
    try {
      const midnightNode = new MidnightNode();
      await midnightNode.reset(options);
    } catch (error) {
      logger.error("Failed to reset node:", error);
      process.exit(1);
    }
  });

program
  .command("health")
  .description("Check if the Midnight Network node is healthy and responding")
  .option("--port <port>", "Port the node is running on", "9944")
  .option("--timeout <timeout>", "Health check timeout in seconds", "30")
  .action(async (options) => {
    try {
      const midnightNode = new MidnightNode();
      await midnightNode.health(options);
    } catch (error) {
      logger.error("Health check failed:", error);
      process.exit(1);
    }
  });

// Error handling
program.on("command:*", () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(" ")}`));
  console.log(chalk.yellow("See --help for a list of available commands."));
  process.exit(1);
});

program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
