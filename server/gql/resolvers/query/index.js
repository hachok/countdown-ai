export const Queries = {
  user(parent, args, context, info) {
    if (!context.request.id) {
      return null;
    }
    return context.db.query.user({
      where: { id: context.request.id }
    }, info);
  },
  users(parent, args, context, info) {
    return context.db.query.users({}, info);
  }
};