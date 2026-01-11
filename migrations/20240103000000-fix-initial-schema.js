'use strict';

/**
 * Bu migration, bilinçli bırakılmış model/migration tutarsızlıklarını düzeltir.
 * - customers.is_active alanını ekler (Customer modelinde var)
 * - orders.status alanını NOT NULL + default 'pending' yapar
 * - orders.customer_id için foreign key constraint ekler
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // customers.is_active
    await queryInterface.addColumn('customers', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    // orders.status (modelde NOT NULL)
    await queryInterface.changeColumn('orders', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'pending'
    });

    // foreign key constraint
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('orders', 'fk_orders_customer_id');
    await queryInterface.changeColumn('orders', 'status', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.removeColumn('customers', 'is_active');
  }
};
