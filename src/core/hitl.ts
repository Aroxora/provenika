/**
 * Human-in-the-Loop (HITL) System
 * Pauses AI execution and prompts users for important decision paths
 * This is the ONLY HITL system in the repository
 */

import { stdin, stdout } from 'node:process';
import * as readline from 'node:readline';
import chalk from 'chalk';
import { authorizedShutdown, isShutdownInProgress, onShutdown, installSignalHandlers } from './shutdown.js';

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
}

export interface DecisionRequest {
  id: string;
  title: string;
  description: string;
  context: string;
  options: DecisionOption[];
  defaultOptionId?: string;
  requiresExplicitChoice: boolean;
  metadata?: Record<string, any>;
}

export interface DecisionResponse {
  requestId: string;
  selectedOptionId: string;
  userInput?: string;
  timestamp: Date;
}

export interface HITLConfig {
  /**
   * Whether to automatically pause execution for decisions
   * If false, decisions will be logged but execution continues
   */
  autoPause: boolean;
  
  /**
   * Timeout in milliseconds before auto-proceeding with default
   * 0 means no timeout (wait indefinitely)
   */
  timeoutMs: number;
  
  /**
   * Default option to choose if timeout occurs
   */
  timeoutDefaultOptionId?: string;
  
  /**
   * Log level: 'none' | 'minimal' | 'detailed'
   */
  logLevel: 'none' | 'minimal' | 'detailed';
}

export class HITLSystem {
  private config: HITLConfig;
  private pendingDecisions: Map<string, DecisionRequest> = new Map();
  private decisionHistory: DecisionResponse[] = [];
  private rl?: readline.Interface;

  constructor(config?: Partial<HITLConfig>) {
    this.config = {
      autoPause: true,
      timeoutMs: 0,
      logLevel: 'detailed',
      ...config
    };
  }

  /**
   * Request a human decision
   * @returns Promise that resolves with the selected option ID
   */
  async requestDecision(request: DecisionRequest): Promise<string> {
    // If request already has an ID, use it, otherwise generate one
    const requestId = request.id || `DECISION-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const fullRequest: DecisionRequest = {
      ...request,
      id: requestId
    };

    this.pendingDecisions.set(requestId, fullRequest);
    
    if (this.config.logLevel !== 'none') {
      this.logDecisionRequest(fullRequest);
    }

    // If auto-pause is disabled, return default or first option
    if (!this.config.autoPause) {
      const selectedOptionId = request.defaultOptionId || request.options[0]?.id;
      if (selectedOptionId) {
        const response: DecisionResponse = {
          requestId,
          selectedOptionId,
          timestamp: new Date()
        };
        this.recordDecision(response);
        
        if (this.config.logLevel === 'detailed') {
          console.log(chalk.yellow(`⚠️  Auto-proceeding with option: ${this.getOptionLabel(request, selectedOptionId)}`));
        }
        return selectedOptionId;
      }
    }

    // Show decision prompt to user
    return this.promptUserForDecision(fullRequest);
  }

  /**
   * Present decision to user and wait for input
   */
  private async promptUserForDecision(request: DecisionRequest): Promise<string> {
    // Ensure signal handlers are installed for Ctrl+C fallback
    installSignalHandlers();

    // Check if shutdown is already in progress
    if (isShutdownInProgress()) {
      const defaultOption = request.defaultOptionId || request.options[0]?.id;
      if (defaultOption) return defaultOption;
      throw new Error('Shutdown in progress');
    }

    console.log('\n' + chalk.bold.cyan('╔═══════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║                     HUMAN DECISION REQUIRED                    ║'));
    console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════╝\n'));

    console.log(chalk.bold.white(`📋 ${request.title}`));
    console.log(chalk.dim(request.description));
    console.log('');

    if (request.context) {
      console.log(chalk.blue('📝 Context:'));
      console.log(chalk.dim(request.context));
      console.log('');
    }

    console.log(chalk.bold.green('🔘 Available options:'));

    request.options.forEach((option, index) => {
      const shortcut = option.shortcut || String(index + 1);
      const isDefault = request.defaultOptionId === option.id;
      const defaultMarker = isDefault ? chalk.dim(' (default)') : '';

      console.log(`  ${chalk.bold.cyan(`${shortcut}.`)} ${chalk.bold.white(option.label)}${defaultMarker}`);
      console.log(`     ${chalk.dim(option.description)}`);
      console.log('');
    });

    console.log(chalk.yellow('💡 You can also:'));
    console.log(chalk.dim('  • Type a custom plan or instruction'));
    console.log(chalk.dim('  • Press Enter to accept the default option'));
    console.log(chalk.dim('  • Type "cancel" or press Ctrl+C to abort'));
    console.log('');

    const prompt = chalk.bold.magenta('👉 Your choice: ');

    return new Promise((resolve, reject) => {
      // Create readline interface with explicit terminal settings
      if (!this.rl) {
        this.rl = readline.createInterface({
          input: stdin,
          output: stdout,
          terminal: stdin.isTTY
        });

        // Handle Ctrl+C via readline's 'close' event and SIGINT
        this.rl.on('close', () => {
          if (!isShutdownInProgress()) {
            console.log(chalk.red('\n❌ Operation cancelled'));
            void authorizedShutdown(130);
          }
        });

        // Handle SIGINT specifically for this readline
        this.rl.on('SIGINT', () => {
          console.log(chalk.red('\n❌ Interrupted'));
          this.cleanupReadline();
          void authorizedShutdown(130);
        });
      }

      // Register cleanup callback for graceful shutdown
      const unregisterCleanup = onShutdown(() => {
        this.cleanupReadline();
      });

      const timeoutId = this.config.timeoutMs > 0
        ? setTimeout(() => {
            if (this.config.timeoutDefaultOptionId) {
              console.log(chalk.yellow(`\n⏰ Timeout - auto-selecting default option`));
              unregisterCleanup();
              this.cleanupReadline();
              resolve(this.config.timeoutDefaultOptionId);
            }
          }, this.config.timeoutMs)
        : undefined;

      const handleAnswer = (answer: string): void => {
        if (timeoutId) clearTimeout(timeoutId);
        unregisterCleanup();

        // Check for shutdown during input
        if (isShutdownInProgress()) {
          const defaultOption = request.defaultOptionId || request.options[0]?.id;
          this.cleanupReadline();
          if (defaultOption) {
            resolve(defaultOption);
          } else {
            reject(new Error('Shutdown in progress'));
          }
          return;
        }

        const trimmedAnswer = answer.trim().toLowerCase();

        // Handle cancellation
        if (trimmedAnswer === 'cancel' || trimmedAnswer === 'abort' || trimmedAnswer === 'quit' || trimmedAnswer === 'exit') {
          console.log(chalk.red('❌ Operation cancelled by user'));
          this.cleanupReadline();
          void authorizedShutdown(0);
          return;
        }

        // Handle empty input (use default)
        if (!trimmedAnswer && request.defaultOptionId) {
          console.log(chalk.green(`✅ Using default option: ${this.getOptionLabel(request, request.defaultOptionId)}`));
          this.cleanupReadline();
          resolve(request.defaultOptionId);
          return;
        }

        // Check for shortcut matches
        for (const option of request.options) {
          if (option.shortcut && option.shortcut.toLowerCase() === trimmedAnswer) {
            console.log(chalk.green(`✅ Selected: ${option.label}`));
            this.cleanupReadline();
            resolve(option.id);
            return;
          }
        }

        // Check for numeric selection
        const numericMatch = trimmedAnswer.match(/^\d+$/);
        if (numericMatch) {
          const index = parseInt(numericMatch[0], 10) - 1;
          if (index >= 0 && index < request.options.length) {
            const selectedOption = request.options[index];
            console.log(chalk.green(`✅ Selected: ${selectedOption.label}`));
            this.cleanupReadline();
            resolve(selectedOption.id);
            return;
          }
        }

        // Check for option ID match
        for (const option of request.options) {
          if (option.id.toLowerCase() === trimmedAnswer) {
            console.log(chalk.green(`✅ Selected: ${option.label}`));
            this.cleanupReadline();
            resolve(option.id);
            return;
          }
        }

        // If we get here, it's custom input
        console.log(chalk.green(`✅ Using custom input: "${answer}"`));

        // Create a custom option response
        const customOptionId = `custom-${Date.now()}`;
        const response: DecisionResponse = {
          requestId: request.id,
          selectedOptionId: customOptionId,
          userInput: answer,
          timestamp: new Date()
        };

        this.recordDecision(response);
        this.cleanupReadline();
        resolve(customOptionId);
      };

      this.rl.question(prompt, handleAnswer);
    });
  }

  private cleanupReadline(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = undefined;
    }
  }

  private getOptionLabel(request: DecisionRequest, optionId: string): string {
    const option = request.options.find(opt => opt.id === optionId);
    return option ? option.label : optionId;
  }

  private logDecisionRequest(request: DecisionRequest): void {
    if (this.config.logLevel === 'minimal') {
      console.log(chalk.yellow(`⚠️  Decision required: ${request.title}`));
      return;
    }
    
    console.log(chalk.yellow(`\n⚠️  Decision Point: ${request.title}`));
    console.log(chalk.dim(`   ${request.description}`));
    console.log(chalk.dim(`   Options: ${request.options.map(o => o.label).join(', ')}`));
  }

  private recordDecision(response: DecisionResponse): void {
    this.decisionHistory.push(response);
    this.pendingDecisions.delete(response.requestId);
    
    // Log the decision
    if (this.config.logLevel === 'detailed') {
      const request = this.pendingDecisions.get(response.requestId);
      const optionLabel = request ? this.getOptionLabel(request, response.selectedOptionId) : response.selectedOptionId;
      
      console.log(chalk.green(`📝 Decision recorded: ${optionLabel}`));
      if (response.userInput) {
        console.log(chalk.dim(`   Custom input: ${response.userInput}`));
      }
    }
  }

  /**
   * Get decision history
   */
  getHistory(): DecisionResponse[] {
    return [...this.decisionHistory];
  }

  /**
   * Clear decision history
   */
  clearHistory(): void {
    this.decisionHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HITLConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
let hitlInstance: HITLSystem | null = null;

/**
 * Get the global HITL instance
 */
export function getHITL(config?: Partial<HITLConfig>): HITLSystem {
  if (!hitlInstance) {
    hitlInstance = new HITLSystem(config);
  }
  
  if (config) {
    hitlInstance.updateConfig(config);
  }
  
  return hitlInstance;
}

/**
 * Helper function for common decision patterns
 */
export const hitl = {
  /**
   * Request a yes/no decision
   */
  async askYesNo(title: string, description: string, context: string = '', defaultYes: boolean = true): Promise<boolean> {
    const hitl = getHITL();
    
    const decision = await hitl.requestDecision({
      id: `yesno-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      description,
      context,
      options: [
        {
          id: 'yes',
          label: 'Yes',
          description: 'Proceed with the suggested plan',
          shortcut: 'y'
        },
        {
          id: 'no',
          label: 'No',
          description: 'Do not proceed',
          shortcut: 'n'
        }
      ],
      defaultOptionId: defaultYes ? 'yes' : 'no',
      requiresExplicitChoice: true
    });
    
    return decision === 'yes';
  },

  /**
   * Request selection from multiple options
   */
  async selectOption(title: string, description: string, options: Array<{id: string, label: string, description: string}>, context: string = '', defaultOptionId?: string): Promise<string> {
    const hitl = getHITL();
    
    const decision = await hitl.requestDecision({
      id: `select-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      description,
      context,
      options: options.map((opt, index) => ({
        ...opt,
        shortcut: String(index + 1)
      })),
      defaultOptionId,
      requiresExplicitChoice: true
    });
    
    return decision;
  },

  /**
   * Request approval for a risky operation
   */
  async requestApproval(title: string, riskDescription: string, operationDetails: string): Promise<boolean> {
    return hitl.askYesNo(
      `APPROVAL REQUIRED: ${title}`,
      riskDescription,
      operationDetails,
      false // Default to "no" for safety
    );
  }
};