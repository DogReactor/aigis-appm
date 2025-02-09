#!/usr/bin/env node

import { Command } from 'commander';
import * as readline from 'readline'
import * as fs from 'fs';
import { posix } from 'path'
import AdmZip from 'adm-zip'
import axios from 'axios'
import * as url from 'url';
import * as _path from 'path'

const path = posix;
const host = 'api.pigtv.moe';

// Read package version
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
const version = packageJson.version;

interface IConfig {
    AuthorList: { [key: string]: string }
}

class Config implements IConfig {
    public AuthorList: { [key: string]: string } = {}
}

class Ignore {
    public IgnoreList: string[] = [];
    constructor(ignoreList?: string[]) {
        if (ignoreList) {
            this.IgnoreList = ignoreList;
        }
    }
    isIgnored(p: string) {
        return this.IgnoreList.find((v) => {
            if (p.indexOf(v) !== -1) return true;
            return false;
        });
    }
}

// Initialize config
const configPath = path.join(__dirname, 'config.json');
let config: Config;

if (!fs.existsSync(configPath)) {
    config = new Config();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
} else {
    try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config = Object.assign(new Config(), configData);
    } catch (error) {
        console.error('Error reading config file, creating new one');
        config = new Config();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    }
}

const program = new Command();

program.version(version);

program
    .command('addauthor')
    .argument('[authorname]', 'author name')
    .argument('[password]', 'password')
    .description('add author')
    .action((authorname: string, password: string) => {
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

interface IManifest {
    name?: string;
    author: string;
    description?: string;
    version?: string;
    pluginName?: string;
}

function publish(_cmd: unknown): void {
    // read Mainfest
    if (!fs.existsSync('manifest.json')) {
        console.log('This is not a AigisPlayer Plugin');
        return;
    }
    let manifest: IManifest;
    try {
        manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));
    } catch{
        console.log('Error on reading manifest.json');
        return;
    }
    if (!config.AuthorList[manifest.author]) {
        console.log('You need set password for ' + manifest.author);
        // return;
    }
    // filelist
    const basePath = process.cwd();
    const ignore = new Ignore(
        fs.existsSync(path.join(basePath, '.ignore')) ?
            fs.readFileSync(path.join(basePath, '.ignore'), 'utf-8').split('\n') : undefined
    );
    const fileList: string[] = [];
    function walk(p: string) {
        const dirList = fs.readdirSync(p);
        dirList.forEach((v) => {
            const newPath = path.join(p, v);
            // if the newPath need to be ignore
            if (!ignore.isIgnored(newPath)) {
                // is dir
                if (fs.statSync(newPath).isDirectory()) {
                    walk(newPath);
                } else {
                    fileList.push(path.relative(basePath, newPath));
                }
            }
        })
    }
    walk(basePath);
    if (fileList.length <= 0) {
        console.log('Fuck You');
        return;
    }

    // Create zip file
    const zip = new AdmZip();
    
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
    axios.post(u, zipBuffer, {
        headers: {
            'Content-Type': 'application/zip'
        }
    })
    .then(response => {
        console.log(response.data);
    })
    .catch(error => {
        if (axios.isAxiosError(error)) {
            console.error('Error uploading plugin:', error.response?.data || error.message);
        } else {
            console.error('Error uploading plugin:', error instanceof Error ? error.message : 'Unknown error');
        }
    });
}

function init(_cmd: unknown): void {
}

async function reg(author: string, password: string, _cmd: unknown): Promise<void> {
    const u = url.format({
        protocol: 'https',
        hostname: host,
        pathname: '/reg'
    });
    
    try {
        const response = await axios.post(u, {
            author,
            password
        });
        console.log(response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error registering:', error.response?.data || error.message);
        } else {
            console.error('Error registering:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
}
