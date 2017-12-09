export default (sequelize, DataTypes) =>
  sequelize.define('repo_member', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: { type: DataTypes.UUID, allowNull: false },
    repo_id: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
  });
