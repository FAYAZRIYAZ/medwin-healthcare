class AddRegNumberToDoctors < ActiveRecord::Migration[8.1]
  def change
    add_column :doctors, :reg_number, :string
  end
end