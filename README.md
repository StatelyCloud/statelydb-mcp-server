# StatelyDB MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that integrates with the [StatelyDB CLI](https://statelydb.com/) to enable AI assistants to validate and manage StatelyDB schemas.

## Prerequisites

- **Node.js**: Version 20 or higher

## Installation

## Configuring for Claude Code

Run `claude mcp add statelydb -- npx -y @stately-cloud/statelydb-mcp-server@latest` to add the MCP server to your Claude Code.

## Configuring with Claude Desktop

To use this MCP server with Claude Desktop, follow these steps:

1. Open your Claude Desktop App configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the server configuration to the `mcpServers` section:

```json
{
  "mcpServers": {
    "statelydb": {
      "command": "npx",
      "args": ["-y", "@stately-cloud/statelydb-mcp-server@latest"]
    }
  }
}
```

3. Save the file and restart Claude Desktop.

## Manually install from npm registry

Install the server globally:

```bash
npm install -g @stately-cloud/statelydb-mcp-server
```

Alternatively, you can run it directly with npx:

```bash
npx @stately-cloud/statelydb-mcp-server@latest
```

## From local source

To install directly from your local source code:

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies and link the package locally:

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Create a global symlink to your local code
npm link
```

This will create a global `statelydb-mcp-server` command that uses your local code.

To unlink later, you can run:

```bash
npm unlink statelydb-mcp-server
```

## Available Tools

This MCP server exposes the following tools:

### 1. `validate-schema`

Validates a StatelyDB elastic schema definition.

**Input:**
- `schema`: String containing the schema definition

**Output:**
- Success: "Schema is valid."
- Failure: "Schema is invalid. Error: [error message]"

**Example:**

```
Could you validate this StatelyDB schema?

import {
  itemType,
  string,
  timestampSeconds,
  uint,
  uuid,
} from "@stately-cloud/schema";

/** A user of our fantastic new system. */
itemType("User", {
  keyPath: "/user-:id",
  fields: {
    id: {
      type: uuid,
      initialValue: "uuid",
    },
    displayName: {
      type: string,
    },
    email: {
      type: string,
    },
    lastLoginDate: {
      type: timestampSeconds,
    },
    numLogins: {
      type: uint,
    },
  },
});
```

### 2. `validate-migrations`

Validates that schema migrations are valid. This is the same as running `stately schema put` in dry-run mode.

**Input:**
- `schema`: String containing the schema definition
- `schemaId`: Your StatelyDB schema ID

**Output:**
- Success: "Migrations are valid."
- Failure: "Migrations are invalid. Error: [error message]"

**Example:**

```
Could you check if this StatelyDB schema has valid migrations?

import {
  itemType,
  string,
  timestampSeconds,
  uint,
  uuid,
} from "@stately-cloud/schema";

itemType("User", {
  keyPath: "/user-:id",
  fields: {
    id: {
      type: uuid,
      initialValue: "uuid",
    },
    displayName: {
      type: string,
    },
    email: {
      type: string,
    },
    lastLoginDate: {
      type: timestampSeconds,
    },
    loginCount: {
      type: uint,
    },
  },
});

migrate(1, "Rename the numLogins field", (m) => {
  m.changeType("User", (t) => {
    t.renameField("numLogins", "loginCount");
  });
});

```

### 3. `attempt-login`

Initiates the Stately login process, providing a URL for authentication.

**Input:**
- None

**Output:**
- URL for authentication: "Please visit this URL to complete the authentication process: [url]"

**Example:**

```
Could you help me log into StatelyDB?
```

### 4. `verify-login`

Verifies if the user is currently logged in to StatelyDB.

**Input:**
- None

**Output:**
- Success: "Login verified. [user information]"
- Failure: "Not logged in."

**Example:**

```
Am I currently logged into StatelyDB?
```

### 5. `schema-put`

Publishes a schema to StatelyDB.

**Input:**
- `schema`: String containing the schema definition
- `schemaId`: Your StatelyDB schema ID

**Output:**
- Success: "Schema published successfully: [output]"
- Failure: "Failed to publish schema: [error message]"

**Example:**

```
Publish this StatelyDB schema:

import {
  itemType,
  string,
  timestampSeconds,
  uint,
  uuid,
} from "@stately-cloud/schema";

/** A user of our fantastic new system. */
itemType("User", {
  keyPath: "/user-:id",
  fields: {
    id: {
      type: uuid,
      initialValue: "uuid",
    },
    displayName: {
      type: string,
    },
    email: {
      type: string,
    },
    lastLoginDate: {
      type: timestampSeconds,
    },
    numLogins: {
      type: uint,
    },
  },
});
```

### 6. `schema-generate`

Generates client code for a specified language from a StatelyDB schema.

**Input:**
- `schemaId`: Your StatelyDB schema ID
- `language`: One of "typescript", "python", "ruby", "go"

**Output:**
- List of generated files with their contents

**Example:**

```
Could you generate TypeScript client code for schema id 1234?
```

## Security Considerations

- This MCP server runs local commands on your machine. Always review schemas before publishing them.
- The server requires access to the Stately CLI and your Stately authentication credentials.
- No data is sent to external services except through the official Stately CLI.

## License

Apache 2.0