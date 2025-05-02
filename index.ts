#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec, execSync } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const server = new McpServer({
  name: "statelydb-mcp-server",
  version: "1.0.0"
});

// Create a temporary directory for stately operations
async function createTempDirectory(): Promise<string> {
  try {
    // Generate a unique directory name but don't create it yet
    const tempDirName = path.join(os.tmpdir(), `statelydb-mcp-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    
    // Let the stately schema init command create the directory
    await execAsync(`stately schema init ${tempDirName}`);
    return tempDirName;
  } catch (error) {
    console.error('Failed to initialize stately schema:', error);
    throw new Error(`Failed to initialize stately schema: ${error instanceof Error ? error.message : String(error)}`);
  }
}

server.tool(
  "statelydb-validate-schema",
  "Validate a StatelyDB elastic schema definition.",
  { 
    schema: z.string().describe("The schema definition to validate") 
  },
  async ({ schema }) => {
    // Create a temporary directory with stately schema init
    const tempDir = await createTempDirectory();
    
    try {
      // Write the schema to a temporary file
      const schemaFilePath = path.join(tempDir, 'schema.ts');
      fs.writeFileSync(schemaFilePath, schema);
      
      // Run the stately CLI to validate the schema
      const { stdout, stderr } = await execAsync(`stately schema validate ${schemaFilePath}`, { cwd: tempDir });
      
      // Check if validation was successful based on stdout containing "Schema is valid"
      const isValid = stdout.includes("Schema is valid");
      
      if (isValid) {
        return {
          content: [
            { 
              type: "text", 
              text: "Schema is valid." 
            }
          ],
          isError: false
        };
      } else {
        return {
          content: [
            { 
              type: "text", 
              text: `Schema is invalid. Error: ${stderr}\nOutput: ${stdout}`
            }
          ],
          isError: true
        };
      }
    } catch (error) {
      // Extract both stdout and stderr from the error object if available
      let errorMessage = error instanceof Error ? error.message : String(error);
      let stdout = '';
      
      if (error instanceof Error && 'stdout' in error) {
        stdout = (error as any).stdout || '';
      }
      
      return {
        content: [
          { 
            type: "text", 
            text: `Failed to validate schema: ${errorMessage}${stdout ? `\n\nCommand output: ${stdout}` : ''}`
          }
        ],
        isError: true
      };
    } finally {
      // Clean up temporary directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to clean up temporary directory ${tempDir}:`, error);
      }
    }
  }
);

server.tool(
  "statelydb-validate-migrations",
  "Validate schema migrations inside of a StatelyDB elastic schema definition.",
  { 
    schema: z.string().describe("The schema definition to validate"),
    schemaId: z.string().describe("The schema ID")
  },
  async ({ schema, schemaId }) => {
    // Create a temporary directory with stately schema init
    const tempDir = await createTempDirectory();
    
    try {
      // Write the schema to a temporary file
      const schemaFilePath = path.join(tempDir, 'schema.ts');
      fs.writeFileSync(schemaFilePath, schema);
      
      // Run the stately CLI to validate migrations in dry-run mode
      const { stdout, stderr } = await execAsync(`stately schema put -s ${schemaId} ${schemaFilePath} --dry-run`, { cwd: tempDir });
      
      // Check if validation was successful
      const isValid = stdout.includes("Dry Run: Schema was not published.") && !stdout.includes("✘");
      
      return {
        content: [
          { 
            type: "text", 
            text: isValid 
              ? "Migrations are valid." 
              : `Migrations are invalid. Error: ${stderr} Output: ${stdout}`
          }
        ],
        isError: !isValid
      };
    } catch (error) {
      // Extract both stdout and stderr from the error object if available
      let errorMessage = error instanceof Error ? error.message : String(error);
      let stdout = '';
      
      if (error instanceof Error && 'stdout' in error) {
        stdout = (error as any).stdout || '';
      }
      
      return {
        content: [
          { 
            type: "text", 
            text: `Failed to validate migrations: ${errorMessage}${stdout ? `\n\nCommand output: ${stdout}` : ''}`
          }
        ],
        isError: true
      };
    } finally {
      // Clean up temporary directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to clean up temporary directory ${tempDir}:`, error);
      }
    }
  }
);

server.tool(
  "statelydb-attempt-login",
  "Initiate StatelyDB login process and get an authorization URL",
  {},
  async () => {
    try {
      // Run the stately login command
      const { stdout, stderr } = await execAsync('stately login');
      
      // Extract the URL from the output
      const urlMatch = stdout.match(/(https:\/\/oauth\.stately\.cloud\/activate\?user_code=[\w-]+)/i);
      
      if (urlMatch && urlMatch[1]) {
        return {
          content: [
            { 
              type: "text", 
              text: `Please visit this URL to complete the authentication process: ${urlMatch[1]}`
            }
          ]
        };
      } else {
        return {
          content: [
            { 
              type: "text", 
              text: `Login URL not found in output. Full output: ${stdout}${stderr ? `\nError: ${stderr}` : ''}`
            }
          ],
          isError: true
        };
      }
    } catch (error) {
      // Extract both stdout and stderr from the error object if available
      let errorMessage = error instanceof Error ? error.message : String(error);
      let stdout = '';
      
      if (error instanceof Error && 'stdout' in error) {
        stdout = (error as any).stdout || '';
      }
      
      return {
        content: [
          { 
            type: "text", 
            text: `Failed to initiate login: ${errorMessage}${stdout ? `\n\nCommand output: ${stdout}` : ''}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "statelydb-verify-login",
  "Verify if the user is logged in to StatelyDB. This command can also tell you what organizations, stores, and schemas you have access to.",
  {},
  async () => {
    try {
      // Run the stately whoami command
      const { stdout, stderr } = await execAsync('stately whoami');
      
      // Check if login is valid
      const isLoggedIn = stdout.includes("Stately UserID");
      
      return {
        content: [
          { 
            type: "text", 
            text: isLoggedIn 
              ? `You are logged in. Details: ${stdout}` 
              : "You are not logged in."
          }
        ],
        isError: !isLoggedIn
      };
    } catch (error) {
      return {
        content: [
          { 
            type: "text", 
            text: `Failed to verify login: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "statelydb-schema-put",
  "Publish an elastic schema version definition to StatelyDB",
  { 
    schema: z.string().describe("The schema definition to publish"),
    schemaId: z.string().describe("The schema ID")
  },
  async ({ schema, schemaId }) => {
    // Create a temporary directory with stately schema init
    const tempDir = await createTempDirectory();
    
    try {
      // Write the schema to a temporary file
      const schemaFilePath = path.join(tempDir, 'schema.ts');
      fs.writeFileSync(schemaFilePath, schema);
      
      // Run the stately CLI to put the schema
      const { stdout, stderr } = await execAsync(`stately schema put -s ${schemaId} ${schemaFilePath}`, { cwd: tempDir });
      
      // Check if publish was successful
      const isPublished = !stderr;
      
      return {
        content: [
          { 
            type: "text", 
            text: isPublished 
              ? `Schema published successfully: ${stdout}` 
              : `Failed to publish schema: ${stderr} ${stdout}`
          }
        ],
        isError: !isPublished
      };
    } catch (error) {
      return {
        content: [
          { 
            type: "text", 
            text: `Failed to publish schema! ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    } finally {
      // Clean up temporary directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to clean up temporary directory ${tempDir}:`, error);
      }
    }
  }
);

server.tool(
  "statelydb-schema-generate",
  "Generate client code from a published StatelyDB schema version definition. Supported languages: TypeScript, Python, Ruby, Go.",
  { 
    schemaId: z.string().describe("The schema ID"),
    language: z.enum(["typescript", "python", "ruby", "go"]).describe("The language to generate code for")
  },
  async ({ schemaId, language }) => {
    // Create a temporary output directory with a name appropriate for the language
    let outputDir: string;
    
    if (language === "go") {
      // For Go, use only alphanumeric characters to create a valid package name
      outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'statelygo'));
      
      // Go requires a go.mod file with a valid import path containing at least one period
      try {
        // Initialize a go module in the directory with a valid import path
        await execAsync(`go mod init github.com/stately/schema`, { cwd: outputDir });
      } catch (error) {
        console.error('Failed to initialize Go module:', error);
        throw new Error('Failed to initialize Go module. Make sure Go is installed and available in your PATH.');
      }
    } else {
      outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stately-gen-'));
    }
    
    try {
      // Run the stately CLI to generate code
      await execAsync(`stately schema generate -s ${schemaId} -l ${language} ${outputDir}`);
      
      // Read and collect all generated files
      const files = collectFiles(outputDir);
      
      if (files.length === 0) {
        return {
          content: [
            { 
              type: "text", 
              text: "No files were generated."
            }
          ],
          isError: true
        };
      }
      
      // Format the output
      const fileListText = files.map(file => 
        `File: ${file.name}\n` +
        `Contents:\n\`\`\`${getLanguageExtension(file.name)}\n${file.content}\n\`\`\``
      ).join('\n\n');
      
      return {
        content: [
          { 
            type: "text", 
            text: `Generated the following files for language ${language}:\n\n${fileListText}`
          }
        ]
      };
    } catch (error) {
      // Extract both stdout and stderr from the error object if available
      let errorMessage = error instanceof Error ? error.message : String(error);
      let stdout = '';
      
      if (error instanceof Error && 'stdout' in error) {
        stdout = (error as any).stdout || '';
      }
      
      return {
        content: [
          { 
            type: "text", 
            text: `Failed to generate schema: ${errorMessage}${stdout ? `\n\nCommand output: ${stdout}` : ''}`
          }
        ],
        isError: true
      };
    } finally {
      // Clean up temporary directory
      try {
        fs.rmSync(outputDir, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to clean up temporary directory ${outputDir}:`, error);
      }
    }
  }
);

// Helper function to recursively collect files from a directory
function collectFiles(dirPath: string, basePath: string = ''): Array<{name: string, content: string}> {
  const files: Array<{name: string, content: string}> = [];
  
  const entries = fs.readdirSync(path.join(dirPath, basePath), { withFileTypes: true });
  
  for (const entry of entries) {
    const relativePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...collectFiles(dirPath, relativePath));
    } else {
      const filePath = path.join(dirPath, relativePath);
      const content = fs.readFileSync(filePath, 'utf8');
      files.push({
        name: relativePath,
        content
      });
    }
  }
  
  return files;
}

// Helper function to get the language extension for syntax highlighting
function getLanguageExtension(filename: string): string {
  const ext = path.extname(filename);
  
  const extensionMap: Record<string, string> = {
    '.ts': 'typescript',
    '.js': 'javascript',
    '.py': 'python',
    '.rb': 'ruby',
    '.go': 'go',
    '.json': 'json',
    '.md': 'markdown'
  };
  
  return extensionMap[ext] || '';
}

const transport = new StdioServerTransport();
server.connect(transport).catch(error => {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  })