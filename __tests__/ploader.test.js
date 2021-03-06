import fs from 'fs';
import os from 'os';
import path from 'path';
import nock from 'nock';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import loadPage from '../src';
import { getLocalPath } from '../src/localPath';

const fixturesDir = '__tests__/fixtures';

describe('ploader', () => {
  let dir;
  let localPath;
  const { sep } = path;
  const host = 'https://hexlet.io';
  const address = `${host}/courses`;
  const html = fs.readFileSync(path.join(fixturesDir, 'index.html'), 'utf-8');
  axios.defaults.adapter = httpAdapter;

  beforeAll(() => {
    axios.defaults.adapter = httpAdapter;
  });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), sep, 'ploader-'));
    localPath = `${dir}/${getLocalPath(address)}`;
    nock(host).get('/courses').reply(200, html);
  });

  it('get #1 page: body', () => {
    const indexHtml = `${dir}/${getLocalPath(address, true)}`;

    return loadPage(address, dir).then(() => {
      const data = fs.openSync(indexHtml, 'r');
      expect(data).toBeTruthy();
    });
  });

  it('load image', () => {
    const imgName = 'attachments-135212adf3dff78a8c27b497b919d820cdbac4b2-store-03657a48b7d43899b1ec98a1d47ee315ed44bb2ac2a3417e3b0b8055784b-image.png';
    const assetImg = fs.readFileSync(path.join(fixturesDir, 'assets', imgName), 'utf-8');
    return loadPage(address, dir)
      .then(() => {
        let actualAsset = '';
        const actualReadable = fs.createReadStream(path.join(localPath, imgName), 'utf-8');
        actualReadable.on('data', (chunk) => {
          actualAsset += chunk;
        });
        actualReadable.on('end', () => {
          const actual = actualAsset.toString();
          expect(actual).toBe(assetImg);
        });
      });
  });

  it('load script', () => {
    const scriptName = 'v2-polyfill.min.js';
    const assetScript = fs.readFileSync(path.join(fixturesDir, 'assets', scriptName), 'utf-8');
    return loadPage(address, dir)
      .then(() => {
        let actualAsset = '';
        const actualReadable = fs.createReadStream(path.join(localPath, scriptName), 'utf-8');
        actualReadable.on('data', (chunk) => {
          actualAsset += chunk;
        });
        actualReadable.on('end', () => {
          const actual = actualAsset.toString();
          expect(actual).toBe(assetScript);
        });
      });
  });

  it('load link', () => {
    const linkName = 'assets-icons-default-favicon-8fa102c058afb01de5016a155d7db433283dc7e08ddc3c4d1aef527c1b8502b6.ico';
    const assetink = fs.readFileSync(path.join(fixturesDir, 'assets', linkName), 'utf-8');
    return loadPage(address, dir)
      .then(() => {
        let actualAsset = '';
        const actualReadable = fs.createReadStream(path.join(localPath, linkName), 'utf-8');
        actualReadable.on('data', (chunk) => {
          actualAsset += chunk;
        });
        actualReadable.on('end', () => {
          const actual = actualAsset.toString();
          expect(actual).toBe(assetink);
        });
      });
  });

  it('check assets dir', () => loadPage(address, dir)
    .then(() => {
      const files = fs.readdirSync(localPath);
      expect(files.length).toBeTruthy();
    }));

  it('get #1 page: failed', () => {
    nock(host).get('/courses/failed').reply(404);
    expect.assertions(1);
    return loadPage(`${address}/failed`, dir).catch((err) => {
      expect(err).not.toBeNull();
    });
  });

  it('500 error: host', () => {
    nock(host).get('/').reply(500);
    expect.assertions(1);
    return loadPage(host, dir)
      .catch((error) => {
        expect(error).toBeInstanceOf(Error);
      });
  });

  it('500 error: dir', () => {
    nock(host).get('/').reply(500);
    expect.assertions(1);
    return loadPage(host, `${dir}/${dir}/${dir}`)
      .catch((error) => {
        expect(error).toBeInstanceOf(Error);
      });
  });

  it('403 error', () => {
    nock(host).get('/account/fat_mike').reply(403);
    expect.assertions(1);
    return loadPage(`${host}/account/fat_mike`, dir)
      .catch((error) => {
        expect(error).toBeInstanceOf(Error);
      });
  });
});
