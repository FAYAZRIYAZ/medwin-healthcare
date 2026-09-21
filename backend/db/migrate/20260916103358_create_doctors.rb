class CreateDoctors < ActiveRecord::Migration[8.1]
  def change
    create_table :doctors do |t|
      t.string :name
      t.string :specialty
      t.string :fee
      t.string :timing
      t.string :phone
      t.string :qualification
      t.string :experience
      t.boolean :available

      t.timestamps
    end
  end
end
