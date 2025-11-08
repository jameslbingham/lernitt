// /server/utils/policies.js  (CommonJS)

const canReschedule = (lesson, now = new Date()) => {
  return lesson && lesson.startTime && (lesson.startTime - now) / 36e5 >= 24;
};

const refundAllowed = () => {
  return false; // Only if required by law
};

module.exports = { canReschedule, refundAllowed };
