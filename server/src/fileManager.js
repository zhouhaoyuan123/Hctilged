const sshManager = require('./sshManager');

class FileManager {
  async readFile(path) {
    try {
      const command = `cat "${path.replace(/"/g, '\\"')}"`;
      const content = await sshManager.executeCommand(null, command);
      return content;
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async writeFile(path, content) {
    try {
      // Use base64 to handle special characters safely
      const base64Content = Buffer.from(content).toString('base64');
      const command = `echo "${base64Content}" | base64 -d > "${path.replace(/"/g, '\\"')}"`;
      await sshManager.executeCommand(null, command);
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async listFiles(path) {
    try {
      // Use simple ls to list files and directories
      const command = `ls -1Ap "${path.replace(/"/g, '\\"')}"`;
      const content = await sshManager.executeCommand(null, command);
      if (!content.trim()) {
        return [];
      }
      return content.trim().split('\n').map(name => {
        const isDirectory = name.endsWith('/');
        return {
          name: name.replace(/\/$/, ''),
          isDirectory,
          type: isDirectory ? 'directory' : 'file',
        };
      });
    } catch (error) {
      if (path !== '/') {
        // Try root directory as fallback and notify that we're resetting to root
        const result = await this.listFiles('/');
        return {
          ...result,
          resetToRoot: true,
          error: error.message
        };
      }
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }
}

module.exports = new FileManager();
