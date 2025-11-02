export const canReschedule = (lesson, now = new Date()) => {
  return lesson && lesson.startTime && (lesson.startTime - now) / 36e5 >= 24;
};

export const refundAllowed = () => {
  return false; // Only if required by law
};
