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

import chalk from "chalk";

export class Logger {
  info(message: string, ...args: unknown[]): void {
    console.log(chalk.blue("ℹ"), message, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    console.log(chalk.green("✓"), message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.log(chalk.yellow("⚠"), message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(chalk.red("✗"), message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray("🐛"), message, ...args);
    }
  }
}

export const logger = new Logger();
