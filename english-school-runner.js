'use strict';

// Engineering bounds for the large schooling falsification. This wraps the same
// one()/F() engine without adding semantic rules or changing relation authority.
const mind = require('./universal-language');
const originalOne = mind.one;
mind.one = function boundedOne(options = {}) {
  return originalOne({
    ...options,
    config: {
      resolve_iterations: 28,
      candidate_limit: 24,
      fixed_point_passes: 4,
      history_limit: 4096,
      ...(options.config || {}),
    },
  });
};
require('./english-school');
