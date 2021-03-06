import fs from 'mz/fs';
import url from 'url';
import util from 'util';
import axios from 'axios';
import cheerio from 'cheerio';
import debug from 'debug';
import path from 'path';
import {getLocalPath, getLinkPath} from './localPath';

const pageDebug = debug('ploader:page');
const createDir = util.promisify(fs.mkdir);
const openDir = util.promisify(fs.open);

const loadPage = (address, folder) => {
  pageDebug('start loading your page');
  const indexHtml = path.join(folder, getLocalPath(address, 'indexHTML'));
  const localPath = path.join(folder, getLocalPath(address));
  const resources = [];
  pageDebug('sending request');
  return axios(address)
    .then((res) => {
      pageDebug('receiving html');
      const $ = cheerio.load(res.data, { decodeEntities: false });
      pageDebug('selecting assets');
      $('script[src]').add('link[href]').add('img[src]').each((i, el) => {
        const attribute = $(el).prop('name') === 'link' ? 'href' : 'src';
        resources.push($(el).attr(attribute));
        const localUrl = getLinkPath($(el).attr(attribute));
        const newAttr = url.format({host: localPath, pathname: localUrl});
        $(el).attr(attribute, newAttr);
      });
      pageDebug('downloading assets and updating html');
      return Promise.all([
        ...resources.map(el => axios({
          method: 'get',
          url: el,
          responseType: 'stream',
        })),
        fs.writeFile(indexHtml, $.html()),
        openDir(localPath, 'r').catch(() => createDir(localPath)),
      ]);
    })
    .then((resp) => {
      pageDebug('writing assets');
      const data = resp.filter(el => el instanceof Object);
      return Promise.all([resources, ...data.map((el) => {
        const file = getLinkPath(el.request.path);
        return el.data.pipe(fs.createWriteStream(`${localPath}${file}`));
      })]);
    })
    .catch((err) => {
      pageDebug(err);
      return Promise.reject(err);
    });
};

export default loadPage;
