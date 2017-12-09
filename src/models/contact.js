export default (sequelize, DataTypes) =>
  sequelize.define('contact', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: { type: DataTypes.UUID, allowNull: false },
    contact_id: { type: DataTypes.UUID, allowNull: false },
  });
