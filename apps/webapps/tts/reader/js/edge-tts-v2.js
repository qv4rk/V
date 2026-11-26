/*
 * Minimal browser client for Microsoft Edge "Read Aloud" neural TTS.
 * Exposes window.EdgeTTS (new EdgeTTS(text, voice, {rate,pitch,volume}).synthesize() -> {audio: Blob})
 * and window.VoicesManager (VoicesManager.create() -> {voices}).
 *
 * The Sec-MS-GEC v2 token functions below (hashSecMsGecV2, cs64, swapTerm,
 * swapAndMultiply, swapHalves, toUpperHex) are copied from msedge-tts 2.1.1,
 * dist/SecMsGec.js — https://github.com/Migushthe2nd/MsEdgeTTS
 *   MIT License, Copyright (c) 2023 Migushthe2nd
 *   Permission is hereby granted, free of charge, to any person obtaining a copy of this
 *   software and associated documentation files (the "Software"), to deal in the Software
 *   without restriction, including without limitation the rights to use, copy, modify, merge,
 *   publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
 *   to whom the Software is furnished to do so, subject to the following conditions: The above
 *   copyright notice and this permission notice shall be included in all copies or substantial
 *   portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 * No API key or secret is involved: the trusted client token is the public one built into Edge.
 */
(function () {
  'use strict';
  const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
  const GEC_VERSION = '2-143.0.3650.96';
  const BASE = 'speech.platform.bing.com/consumer/speech/synthesize/readaloud';
  const WSS_URL = 'wss://' + BASE + '/edge/v1';
  const VOICES_URL = 'https://' + BASE + '/voices/list?trustedclienttoken=' + TRUSTED_CLIENT_TOKEN;
  const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

  // ---- begin MIT code from msedge-tts (SecMsGec.js) ----
  const EDGE_COPYRIGHT = "Copyright (C) Microsoft Corporation. All rights reserved.";
  const SWAP_FIRST_WORD = { swappedWord: 0xEF0569FB, swappedSum: 0x76F50F34, swappedProduct: 0xC3EFEA97 };
  const SWAP_SECOND_WORD = { swappedWord: 0xC31713DB, swappedSum: 0x1881CE3C, swappedProduct: 0x35BD1EC9 };
  const MIX_FIRST_WORD = [0xCF98B111, 0x87085B9F, 0x12CEB96D, 0x257E1D83];
  const MIX_SECOND_WORD = [0xA27416F5, 0xD38396FF, 0x7C932B89, 0xBFA49F69];
  async function hashSecMsGecV2(ticksAndToken) {
    const message = new TextEncoder().encode(EDGE_COPYRIGHT + ticksAndToken);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", message));
    return `${toUpperHex(cs64(message, digest))}-${toUpperHex(digest)}`;
  }
  function cs64(message, digest) {
    const digestView = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
    const firstKey = (digestView.getUint32(0, true) | 1) >>> 0;
    const secondKey = (digestView.getUint32(4, true) | 1) >>> 0;
    const padded = new Uint8Array(Math.ceil(message.length / 8) * 8);
    padded.set(message);
    const words = new DataView(padded.buffer);
    let swapSum = 0, lastSwap = 0, mix = 0, mixSum = 0;
    for (let offset = 0; offset < padded.length; offset += 8) {
      const firstWord = words.getUint32(offset, true);
      const secondWord = words.getUint32(offset + 4, true);
      const firstSwap = swapTerm(firstWord, firstKey, SWAP_FIRST_WORD);
      lastSwap = swapTerm(secondWord, secondKey, SWAP_SECOND_WORD);
      swapSum = (swapSum + firstSwap + lastSwap) >>> 0;
      mix = swapAndMultiply(Math.imul(mix + firstWord, firstKey), MIX_FIRST_WORD);
      mixSum = (mixSum + mix) >>> 0;
      mix = swapAndMultiply(Math.imul(mix + secondWord, secondKey), MIX_SECOND_WORD);
      mixSum = (mixSum + mix) >>> 0;
    }
    const checksum = new Uint8Array(8);
    const checksumView = new DataView(checksum.buffer);
    checksumView.setUint32(0, lastSwap ^ mix, true);
    checksumView.setUint32(4, swapSum ^ mixSum, true);
    return checksum;
  }
  function swapTerm(word, key, multipliers) {
    const sum = Math.imul(word, key) + Math.imul(swapHalves(word), multipliers.swappedWord);
    const product = Math.imul(swapHalves(sum), multipliers.swappedSum) >>> 0;
    return (Math.imul(swapHalves(product), multipliers.swappedProduct) + product) >>> 0;
  }
  function swapAndMultiply(value, multipliers) {
    for (const multiplier of multipliers) value = Math.imul(swapHalves(value), multiplier) >>> 0;
    return value;
  }
  function swapHalves(value) { return ((value << 16) | (value >>> 16)) >>> 0; }
  function toUpperHex(bytes) { return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("").toUpperCase(); }
  // ---- end MIT code ----

  let clockOffsetMs = 0;
  async function secMsGec() {
    const ticks = Math.floor((Date.now() + clockOffsetMs) / 1000) + 11644473600;
    const rounded = ticks - (ticks % 300);
    return hashSecMsGecV2(`${rounded * 10000000}${TRUSTED_CLIENT_TOKEN}`);
  }
  function uuid() { return (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, ''); }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])); }
  function stamp() { return new Date().toUTCString().replace('GMT', 'GMT+0000 (Coordinated Universal Time)'); }

  class EdgeTTS {
    constructor(text, voice, opts) {
      this.text = String(text || ' ');
      this.voice = String(voice || 'en-US-AriaNeural');
      this.opts = Object.assign({ rate: '+0%', pitch: '+0Hz', volume: '+0%' }, opts || {});
      this.timeoutMs = this.opts.timeoutMs || 30000;
    }
    async synthesize() {
      const url = `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${await secMsGec()}&Sec-MS-GEC-Version=${GEC_VERSION}&ConnectionId=${uuid()}`;
      const lang = (this.voice.match(/^[a-z]{2,3}-[A-Z]{2}/) || ['en-US'])[0];
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'><voice name='${esc(this.voice)}'><prosody pitch='${esc(this.opts.pitch)}' rate='${esc(this.opts.rate)}' volume='${esc(this.opts.volume)}'>${esc(this.text)}</prosody></voice></speak>`;
      return new Promise((resolve, reject) => {
        const chunks = [];
        let done = false;
        const ws = new WebSocket(url);
        ws.binaryType = 'arraybuffer';
        const finish = (err) => {
          if (done) return; done = true; clearTimeout(timer);
          try { ws.close(); } catch (e) {}
          if (err) return reject(err);
          if (!chunks.length) return reject(new Error('NoAudioReceived'));
          resolve({ audio: new Blob(chunks, { type: 'audio/mpeg' }) });
        };
        // Never hang: a failed handshake or a silent server ends in an error.
        const timer = setTimeout(() => finish(new Error('Edge TTS timed out')), this.timeoutMs);
        ws.onerror = () => finish(new Error('Edge TTS connection failed'));
        ws.onclose = () => finish(chunks.length ? null : new Error('Edge TTS connection closed without audio'));
        ws.onopen = () => {
          ws.send(`X-Timestamp:${stamp()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
            `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"${OUTPUT_FORMAT}"}}}}`);
          ws.send(`X-RequestId:${uuid()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${stamp()}Z\r\nPath:ssml\r\n\r\n` + ssml);
        };
        ws.onmessage = (ev) => {
          if (typeof ev.data === 'string') {
            if (ev.data.includes('Path:turn.end')) finish(null);
            return;
          }
          const buf = ev.data; const view = new DataView(buf);
          if (buf.byteLength < 2) return;
          const headLen = view.getUint16(0);
          const head = new TextDecoder().decode(new Uint8Array(buf, 2, Math.min(headLen, buf.byteLength - 2)));
          if (head.includes('Path:audio') && buf.byteLength > 2 + headLen) chunks.push(new Uint8Array(buf, 2 + headLen).slice());
        };
      });
    }
  }

  const VoicesManager = {
    async create() {
      const res = await fetch(`${VOICES_URL}&Sec-MS-GEC=${await secMsGec()}&Sec-MS-GEC-Version=${GEC_VERSION}`);
      if (!res.ok) throw new Error('voice list HTTP ' + res.status);
      return { voices: await res.json() };
    }
  };

  window.EdgeTTS = EdgeTTS;
  window.VoicesManager = VoicesManager;
  window.appReady = true;
})();
