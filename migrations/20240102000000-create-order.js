'use strict';

/**
 * Not: status alanı enum düşünülmüş ama sonra vazgeçilmiş gibi.
 * Ayrıca customerId için foreign key eksik.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false
        // TODO: foreign key constraint eklenecekti
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true // modelde NOT NULL
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      // TODO: eski yazılımcı order_items tablosu planlamış ama yok
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orders');
  }
};
