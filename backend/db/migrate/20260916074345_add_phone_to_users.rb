class AddPhoneToUsers < ActiveRecord::Migration[8.0]
  def change
    unless column_exists?(:users, :phone)
      add_column :users, :phone, :string
    end
  end
end
