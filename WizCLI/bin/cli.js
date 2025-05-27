#!/usr/bin/env node
'use strict'; // Add this after shebang
import { Command } from 'commander';
import init from '../src/commands/init.js';

const program = new Command();

program
  .name('wizcli')
  .description('Magical project scaffolding wizard')
  .version('0.0.1');

program.command('init <project>')
  .description('Initialize new project')
  .option('--ts', 'Use TypeScript')
  .action(init);

program.parse(process.argv);