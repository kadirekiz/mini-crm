module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Guest sipariş desteği (customerId yoksa)
    guestFirstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    guestLastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    guestEmail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    guestPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shippingAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'orders',
    underscored: true
  });

  return Order;
};
