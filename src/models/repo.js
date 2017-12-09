export default (sequelize, DataTypes) =>
  sequelize.define('repo', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING, allowNull: false },
    host: { type: DataTypes.UUID, allowNull: false },
    default_path: { type: DataTypes.STRING, allowNull: true },
    is_shared: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  });
