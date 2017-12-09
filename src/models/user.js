export default (sequelize, DataTypes) =>
  sequelize.define('user', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    login: { type: DataTypes.STRING, allowNull: false, unique: true },
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'basic' },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    icon: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    authenticate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  });
