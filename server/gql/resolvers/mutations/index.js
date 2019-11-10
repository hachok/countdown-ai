export const Mutations = {
  async createUser(parent, args, context, info) {
    return await context.db.mutation.createUser({
      data: { ...args } // destructure arguments into the data (name, etc.)
    }, info);
  }
};
