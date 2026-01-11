// Not: Migration dosyasıyla birebir aynı değil, bilinçli tutarsızlık var.
module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define('Customer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false // ama ETL verisinde boş gelebiliyor
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true // TODO: zorunlu mu olmalı kararlaştırılacak
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      // TODO: uygun validator eklenmemiş
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Migration'da yok:
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'customers',
    underscored: true
  });

  return Customer;
};
