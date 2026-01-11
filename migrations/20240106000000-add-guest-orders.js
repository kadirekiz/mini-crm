'use strict';

/**
 * Guest sipariş desteği:
 * - orders.customer_id nullable
 * - orders'a guest_* alanları ve shipping_address ekler
 * - orders.total_amount NOT NULL + default 0
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // FK constraint varken changeColumn bazı DB'lerde sorun çıkarabiliyor; güvenli yaklaşım:
    // Önce constraint'i kaldır, sonra column değiştir, sonra tekrar ekle.
    try {
      await queryInterface.removeConstraint('orders', 'fk_orders_customer_id');
    } catch (e) {
      // yoksa sorun değil
    }

    await queryInterface.changeColumn('orders', 'customer_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addConstraint('orders', {
      fields: ['customer_id'],
      type: 'foreign key',
      name: 'fk_orders_customer_id',
      references: {
        table: 'customers',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });

    await queryInterface.addColumn('orders', 'guest_first_name', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('orders', 'guest_last_name', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('orders', 'guest_email', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('orders', 'guest_phone', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('orders', 'shipping_address', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn('orders', 'total_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'shipping_address');
    await queryInterface.removeColumn('orders', 'guest_phone');
    await queryInterface.removeColumn('orders', 'guest_email');
    await queryInterface.removeColumn('orders', 'guest_last_name');
    await queryInterface.removeColumn('orders', 'guest_first_name');

    try {
      await queryInterface.removeConstraint('orders', 'fk_orders_customer_id');
    } catch (e) {}

    await queryInterface.changeColumn('orders', 'customer_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.addConstraint('orders', {
      fields: ['customer_id'],
      type: 'foreign key',
      name: 'fk_orders_customer_id',
      references: {
        table: 'customers',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });

    await queryInterface.changeColumn('orders', 'total_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
  }
};
