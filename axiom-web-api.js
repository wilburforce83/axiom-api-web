// Axiom web API authored by Will Shearer 2024




// Helper function to make HTTP requests using Fetch API
const makeRequest = async (url, method, data) => {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error:", error.message);
      throw error;
    }
  };
  
  // API functions
  const api = {
    getTimeZones: async (credentials) => {
      const data = await makeRequest(credentials.baseURL + "/getTimeZones", "POST");
      return data;
    },
  
    getUserToken: async (credentials, body) => {
      body = body !== undefined ? body : { blank: "value" };
      const data = await makeRequest(credentials.baseURL + "/getUserToken", "POST", {
        application: body.application !== undefined ? body.application : "Web API",
        timeZone: body.timezone !== undefined ? body.timezone : "GMT Standard Time",
        username: credentials.username,
        password: credentials.password,
      });
      _userToken = data.userToken;
      return data;
    },
  
    browseTags: async (credentials, body, continuation) => {
      body = body !== undefined ? body : { blank: "value" };
      const data = await makeRequest(credentials.baseURL + "/browseTags", "POST", {
        userToken: _userToken,
        deep: body.deep !== undefined ? body.deep : true,
        path: body.path !== undefined ? body.path : "",
      });
      _tags = data.tags;
      return data;
    },
  
    getCurrentValues: async (credentials, body) => {
      body = body !== undefined ? body : { blank: "value" };
      if (_tags.length === 0) {
        return;
      }
      const data = await makeRequest(credentials.baseURL + "/getTagData2", "POST", {
        userToken: _userToken,
        tags: body.tags !== undefined ? body.tags : _tags,
      });
      return data;
    },
  
    getRawData: async (credentials, body, continuation) => {
      body = body !== undefined ? body : { blank: "value" };
      if (_tags.length === 0) {
        return;
      }
      try {
        const data = await makeRequest(credentials.baseURL + "/getTagData2", "POST", {
          userToken: _userToken,
          tags: body.tags !== undefined ? body.tags : _tags,
          startTime: body.startTime !== undefined ? body.startTime : "Now - 24 Hours",
          endTime: body.endTime !== undefined ? body.endTime : "Now",
          maxSize: body.maxSize !== undefined ? body.maxSize : 100000,
          continuation: continuation !== undefined ? continuation : null,
        });
        if (data.continuation !== null) {
          await api.getRawData(credentials, data.continuation);
        } else {
          return data;
        }
      } catch (error) {
        console.error('error', error);
      }
    },
  
    getProcessedData: async (credentials, body, continuation) => {
      body = body !== undefined ? body : { blank: "value" };
      if (_tags.length === 0) {
        return;
      }
      try {
        const data = await makeRequest(credentials.baseURL + "/getTagData2", "POST", {
          userToken: _userToken,
          tags: body.tags !== undefined ? body.tags : _tags,
          startTime: body.startTime !== undefined ? body.startTime : "Now - 24 Hours",
          endTime: body.endTime !== undefined ? body.endTime : "Now",
          aggregateName: body.aggregateName !== undefined ? body.aggregateName : "TimeAverage2",
          aggregateInterval: body.aggregateInterval !== undefined ? body.aggregateInterval : "1 Hour",
          maxSize: body.maxSize !== undefined ? body.maxSize : 100000,
          continuation: continuation !== undefined ? continuation : null,
        });
        if (data.continuation !== null) {
          await api.getProcessedData(credentials, data.continuation);
        } else {
          if (data.data) {
            var FixedData = processTags(data, body.tags);
            return FixedData;
          }
        }
      } catch (error) {
        console.error('error', error);
      }
    },
  
    revokeUserToken: async (credentials) => {
      const data = await makeRequest(credentials.baseURL + "/revokeUserToken", "POST", {
        userToken: _userToken,
      });
      _userToken = null;
      return data;
    },
  
    browseNodes: async (credentials, path) => {
      const data = await makeRequest(credentials.baseURL + "/browseNodes", "POST", {
        userToken: _userToken,
        path: path !== undefined ? path : "",
      });
      const nodes = data.nodes;
      const keys = Object.keys(nodes);
      if (keys.length > 0) {
        const node = nodes[keys[0]];
        if (node.hasNodes) await api.browseNodes(credentials, node.fullPath);
        return data;
      }
      return data;
    },
  
    getAggregates: async (credentials) => {
      const data = await makeRequest(credentials.baseURL + "/getAggregates", "POST", {
        userToken: _userToken,
      });
      return data;
    },
  
    getQualities: async (credentials, qualities) => {
      const data = await makeRequest(credentials.baseURL + "/getQualities", "POST", {
        userToken: _userToken,
        qualities: qualities !== undefined ? qualities : [192, "193", 32768],
      });
      return data;
    },
  
    getTagProperties: async (credentials, body) => {
      body = body !== undefined ? body : { blank: "value" };
      const data = await makeRequest(credentials.baseURL + "/getTagProperties", "POST", {
        userToken: _userToken,
        tags: body.tags !== undefined ? body.tags : _tags,
      });
      return data;
    },
  
    getLiveDataToken: async (credentials, body) => {
      body = body !== undefined ? body : { blank: "value" };
      if (_tags.length === 0) {
        return;
      }
      const data = await makeRequest(credentials.baseURL + "/getLiveDataToken", "POST", {
        userToken: _userToken,
        tags: body.tags !== undefined ? body.tags : _tags,
        mode: body.mode !== undefined ? body.mode : "AllValues",
        includeQuality: true,
      });
      _liveDataToken = data.liveDataToken;
      return data;
    },
  
    getLiveData: async (credentials, continuation) => {
      const data = await makeRequest(credentials.baseURL + "/getLiveData", "POST", {
        userToken: _userToken,
        liveDataToken: _liveDataToken,
        continuation: continuation !== undefined ? continuation : null,
      });
      return data;
    },
  
    revokeLiveDataToken: async (credentials) => {
      const data = await makeRequest(credentials.baseURL + "/revokeLiveDataToken", "POST", {
        userToken: _userToken,
        liveDataToken: _liveDataToken,
      });
      _liveDataToken = null;
      return data;
    },
  
    storeLatestValues: async (credentials) => {
      let liveValues = await api.getCurrentValues(credentials);
      let result = {};
      for (let key in liveValues.data) {
        if (liveValues.data.hasOwnProperty(key) && liveValues.data[key][0]) {
          result[key] = liveValues.data[key][0].v;
        }
      }
      return result;
    },
  
    extractValues: (data) => {
      if (!Array.isArray(data)) {
        throw new Error("Input data must be an array");
      }
      const valuesArray = data.map((item) => item.v);
      return valuesArray;
    },
  
    softTotalizer: async (credentials, body, continuation) => {
      let rawData = await api.getProcessedData(credentials, body);
      let dataValues = api.extractValues(rawData.data[body.tags[0]]);
      var sum = 0;
      for (var i = 0; i < dataValues.length; i++) {
        sum += dataValues[i];
      }
      var multiplier = convertTimeStringToHours(body.aggregateInterval);
      let totaliser = Math.floor(sum * multiplier);
      return totaliser;
    },
  
    softRunHours: async (credentials, body, threshold) => {
      let rawData = await api.getProcessedData(credentials, body);
      let dataValues = api.extractValues(rawData.data[body.tags[0]]);
      var sum = 0;
      var increment = convertTimeStringToHours(body.aggregateInterval);
      for (var i = 0; i < dataValues.length; i++) {
        if (dataValues[i] > threshold) {
          sum++;
        }
      }
      var multiplier = convertTimeStringToHours(body.aggregateInterval);
      let runHours = (sum * multiplier).toFixed(2);
      return runHours;
    },
  };
  
  // HELPER FUNCTIONS
  
  function processTags(data, tags) {
    tags.forEach(tag => {
      if (data.data[tag]) {
        data.data[tag].forEach(item => {
          if (item.v === null) {
            item.v = 0;
          }
        });
      }
    });
    return data;
  }
  
  function convertTimeStringToHours(inputString) {
    const regex = /^(\d+)\s+(\w+)$/;
    const match = inputString.match(regex);
    if (!match) {
      console.error("Invalid input format. Please use the format: '10 seconds', '12 hours', '17 minutes', '10 days', etc.");
      return null;
    }
    const number = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    const conversionFactors = {
      second: 1 / 3600,
      minute: 1 / 60,
      hour: 1,
      day: 24,
      week: 24 * 7,
      seconds: 1 / 3600,
      minutes: 1 / 60,
      hours: 1,
      days: 24,
      weeks: 24 * 7,
    };
    if (!(unit in conversionFactors)) {
      console.error("Invalid time unit. Please use 'second(s)', 'minute(s)', 'hour(s)', 'day(s)', or 'week(s)'.");
      return null;
    }
    const resultInHours = number * conversionFactors[unit];
    return resultInHours;
  }
  
  // Making the API object available globally
  window.api = api;
  