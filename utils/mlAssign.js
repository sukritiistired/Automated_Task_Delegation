
export const assignTask = (task, users) => {
  let bestUser = null;
  let bestScore = -Infinity;

  users.forEach(user => {
    let skillMatch = task.requiredSkills?.filter(skill =>
      user.skills?.includes(skill)
    ).length || 0;

    let loadPenalty = user.currentLoad || 0;

    let score = (skillMatch * 10) - loadPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestUser = user;
    }
  });

  return bestUser;
};
