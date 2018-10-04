#!/usr/bin/env node

import * as program from 'commander';
import * as readline from 'readline'
import * as fs from 'fs';
import { posix } from 'path'
import * as archiver from 'archiver'
import * as request from 'request'
import * as url from 'url';
import * as _path from 'path'

const path = posix;
const host = 'player.aigis.me';

class Config {
    public AuthorList = {}
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

const config: Config = Object.assign(new Config(), JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8')));

program.version('0.1.0');

program
    .command('addauthor [authorname] [password]')
    .description('add author')
    .action((authorname, password, cmd) => {
        config.AuthorList[authorname] = password;
        fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(config));
    })

program
    .command('publish')
    .description('publish plugin')
    .action(publish);

program
    .command('reg [authorname] [password]')
    .description('reg author')
    .action(reg);

program.parse(process.argv);

function publish(cmd) {
    // read Mainfest
    if (!fs.existsSync('manifest.json')) {
        console.log('This is not a AigisPlayer Plugin');
        return;
    }
    let manifest;
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

    // zip + request
    const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });

    archive.on('warning', function (err) {
        if (err.code === 'ENOENT') {
            // log warning
        } else {
            // throw error
            throw err;
        }
    });

    archive.on('error', function (err) {
        throw err;
    });
    const u = url.format({
        protocol: 'http',
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
    })
    archive.pipe(
        request.post(u, (err, res) => {
            console.log(res.body);
        })
    );

    fileList.forEach((v) => {
        const r = path.parse(v);
        archive.file(v, {
            name: r.base,
            prefix: r.dir
        })
    })

    archive.finalize();

}

function init(cmd) {

}

function reg(author, password, cmd) {
    const u = url.format({
        protocol: 'http',
        hostname: host,
        pathname: '/reg'
    });
    request.post(u, {
        form: {
            author: author,
            password: password
        }
    }, (err, res) => {
        console.log(res.body);
    });
}
