# aigis-apm

Aigis Player Plugin Manager - A command line tool for managing and publishing Aigis Player plugins.

## Installation

```bash
npm install -g aigis-apm
```

## Usage

### Register as an author
```bash
apm reg <authorname> <password>
```

### Add author credentials
```bash
apm addauthor <authorname> <password>
```

### Publish a plugin
```bash
cd your-plugin-directory
apm publish
```

Note: You need to have a valid `manifest.json` file in your plugin directory with the following structure:
```json
{
  "name": "your-plugin-name",
  "author": "your-author-name",
  "description": "plugin description",
  "version": "1.0.0",
  "pluginName": "plugin-name"
}
```

## License

MIT 