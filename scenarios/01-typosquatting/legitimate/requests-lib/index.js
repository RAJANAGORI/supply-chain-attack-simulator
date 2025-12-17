/**
 * LEGITIMATE PACKAGE: requests-lib
 * A simple HTTP request library
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class RequestsLib {
  /**
   * Make a GET request
   * @param {string} url - The URL to request
   * @param {object} options - Request options
   * @returns {Promise<object>} Response data
   */
  static async get(url, options = {}) {
    return this._makeRequest('GET', url, null, options);
  }

  /**
   * Make a POST request
   * @param {string} url - The URL to request
   * @param {object} data - Data to send
   * @param {object} options - Request options
   * @returns {Promise<object>} Response data
   */
  static async post(url, data, options = {}) {
    return this._makeRequest('POST', url, data, options);
  }

  /**
   * Internal method to make HTTP requests
   */
  static _makeRequest(method, urlString, data, options) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(urlString);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: options.headers || {}
      };

      if (data) {
        const payload = JSON.stringify(data);
        requestOptions.headers['Content-Type'] = 'application/json';
        requestOptions.headers['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = protocol.request(requestOptions, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = {
              statusCode: res.statusCode,
              headers: res.headers,
              body: body,
              json: () => JSON.parse(body)
            };
            resolve(response);
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: body });
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }
}

module.exports = RequestsLib;

