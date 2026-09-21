class AddImageUrlToDoctors < ActiveRecord::Migration[8.1]
  def change
    add_column :doctors, :image_url, :string
  end
end
