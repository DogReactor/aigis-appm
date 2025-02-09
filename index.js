#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path_1 = require("path");
const adm_zip_1 = __importDefault(require("adm-zip"));
const axios_1 = __importDefault(require("axios"));
const url = __importStar(require("url"));
const _path = __importStar(require("path"));
const path = path_1.posix;
const host = 'api.pigtv.moe';
class Config {
    constructor() {
        this.AuthorList = {};
    }
}
class Ignore {
    constructor(ignoreList) {
        this.IgnoreList = [];
        if (ignoreList) {
            this.IgnoreList = ignoreList;
        }
    }
    isIgnored(p) {
        return this.IgnoreList.find((v) => {
            if (p.indexOf(v) !== -1)
                return true;
            return false;
        });
    }
}
const config = Object.assign(new Config(), JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8')));
const program = new commander_1.Command();
program.version('0.1.0');
program
    .command('addauthor')
    .argument('[authorname]', 'author name')
    .argument('[password]', 'password')
    .description('add author')
    .action((authorname, password) => {
    config.AuthorList[authorname] = password;
    fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(config));
});
program
    .command('publish')
    .description('publish plugin')
    .action(publish);
program
    .command('reg')
    .argument('[authorname]', 'author name')
    .argument('[password]', 'password')
    .description('reg author')
    .action(reg);
program.parse();
function publish(_cmd) {
    // read Mainfest
    if (!fs.existsSync('manifest.json')) {
        console.log('This is not a AigisPlayer Plugin');
        return;
    }
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));
    }
    catch (_a) {
        console.log('Error on reading manifest.json');
        return;
    }
    if (!config.AuthorList[manifest.author]) {
        console.log('You need set password for ' + manifest.author);
        // return;
    }
    // filelist
    const basePath = process.cwd();
    const ignore = new Ignore(fs.existsSync(path.join(basePath, '.ignore')) ?
        fs.readFileSync(path.join(basePath, '.ignore'), 'utf-8').split('\n') : undefined);
    const fileList = [];
    function walk(p) {
        const dirList = fs.readdirSync(p);
        dirList.forEach((v) => {
            const newPath = path.join(p, v);
            // if the newPath need to be ignore
            if (!ignore.isIgnored(newPath)) {
                // is dir
                if (fs.statSync(newPath).isDirectory()) {
                    walk(newPath);
                }
                else {
                    fileList.push(path.relative(basePath, newPath));
                }
            }
        });
    }
    walk(basePath);
    if (fileList.length <= 0) {
        console.log('Fuck You');
        return;
    }
    // Create zip file
    const zip = new adm_zip_1.default();
    fileList.forEach((v) => {
        const r = path.parse(v);
        zip.addLocalFile(v, r.dir);
    });
    // Get zip buffer
    const zipBuffer = zip.toBuffer();
    // Upload zip file
    const u = url.format({
        protocol: 'https',
        hostname: host,
        pathname: '/plugins',
        query: {
            name: manifest.name ? manifest.name : _path.parse(basePath).base,
            password: config.AuthorList[manifest.author],
            author: manifest.author,
            description: manifest.description,
            version: manifest.version,
            pluginName: manifest.pluginName
        }
    });
    // Send request
    axios_1.default.post(u, zipBuffer, {
        headers: {
            'Content-Type': 'application/zip'
        }
    })
        .then(response => {
        console.log(response.data);
    })
        .catch(error => {
        var _a;
        if (axios_1.default.isAxiosError(error)) {
            console.error('Error uploading plugin:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        }
        else {
            console.error('Error uploading plugin:', error instanceof Error ? error.message : 'Unknown error');
        }
    });
}
function init(_cmd) {
}
async function reg(author, password, _cmd) {
    var _a;
    const u = url.format({
        protocol: 'https',
        hostname: host,
        pathname: '/reg'
    });
    try {
        const response = await axios_1.default.post(u, {
            author,
            password
        });
        console.log(response.data);
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error('Error registering:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        }
        else {
            console.error('Error registering:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
}
//# sourceMappingURL=index.js.map