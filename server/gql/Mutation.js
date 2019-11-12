export const Mutation = {
  async createUser(parent, args, context, info) {
    return await context.db.mutation.createUser(
      { args }, // destructure arguments into the data (name, etc.)
      info
    );
  }
};
