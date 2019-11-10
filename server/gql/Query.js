export const Query = {
  user(parent, args, context, info) {
    if (!context.request.id) {
      return null;
    }
    return context.db.query.user({
      where: { id: context.request.id }
    }, info);
  },
  users(parent, args, context) {
    return context.db.query.users();
  }
};
