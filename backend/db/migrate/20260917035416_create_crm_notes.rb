class CreateCrmNotes < ActiveRecord::Migration[8.1]
  def change
    create_table :crm_notes do |t|
      t.string :phone
      t.text :note
      t.string :admin_name

      t.timestamps
    end
  end
end
