const WebTorrent = require('webtorrent');
const { ipcMain } = require('electron');
const mime = require('mime');
const prettyBytes = require('pretty-bytes');
const config = require('application-config')('Snape');
const downloadsFolder = require('downloads-folder');

const client = new WebTorrent();

function init() {
  config.read((err, { download }) => {
    if (download) {
      download.forEach(d =>
        client.add(d.magnetLink, {
          path: downloadsFolder()
        })
      );
    }
  });
}

let interval;

ipcMain.on('init_download_polling', (event) => {
  interval = setInterval(() => {
    const data = {};
    client.torrents.forEach((torrent) => {
      data[torrent.infoHash] = {
        name: torrent.name,
        downloadSpeed: torrent.downloadSpeed,
        progress: torrent.progress * 100,
        uploadSpeed: torrent.uploadSpeed,
        peers: torrent.numPeers,
        torrentId: torrent.infoHash,
        files: torrent.files.map((file, i) => ({
          name: file.name,
          type: mime.lookup(file.name),
          progress: Math.round(file.downloaded / file.length * 100),
          size: prettyBytes(file.length),
          slug: `${torrent.infoHash}/${i}/${file.name}`
        }))
      };
    });

    event.sender.send('download_data', data);
  }, 1000);
});

function getTorrent(torrentId) {
  return client.get(torrentId);
}

ipcMain.on('end_download_polling', () => {
  clearInterval(interval);
});

ipcMain.on('add_torrent_to_download', (event, magnetLink) =>
  client.add(magnetLink, {
    path: downloadsFolder()
  })
);

ipcMain.on('remove_torrent', (event, magnetLink) => client.remove(magnetLink));

module.exports = {
  init,
  getTorrent
};
