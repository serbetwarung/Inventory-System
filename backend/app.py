from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import io
import xlsxwriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
import bcrypt
import re
from email_validator import validate_email, EmailNotValidError
from marshmallow import Schema, fields, ValidationError, validate
import pymysql

# Initialize PyMySQL
pymysql.install_as_MySQLdb()

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)

# Skema Validasi
class UserSchema(Schema):
    username = fields.Str(required=True, validate=[
        validate.Length(min=3, max=50, error='Username harus antara 3-50 karakter')
    ])
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=[
        validate.Length(min=8, error='Password minimal 8 karakter')
    ])

class ProductSchema(Schema):
    name = fields.Str(required=True, validate=[
        validate.Length(min=2, max=100, error='Nama produk harus antara 2-100 karakter')
    ])
    description = fields.Str(allow_none=True)
    quantity = fields.Int(validate=validate.Range(min=0, error='Stok tidak boleh negatif'))
    min_quantity = fields.Int(validate=validate.Range(min=0, error='Stok minimal tidak boleh negatif'))

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    quantity = db.Column(db.Integer, default=0)
    min_quantity = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validasi data
        user_schema = UserSchema()
        errors = user_schema.validate(data)
        if errors:
            return jsonify({"error": errors}), 400

        # Cek username unik
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"error": "Username sudah digunakan"}), 400

        # Cek email unik
        if User.query.filter_by(email=data['email']).first():
            return jsonify({"error": "Email sudah digunakan"}), 400

        # Hash password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())

        # Buat user baru
        new_user = User(
            username=data['username'],
            email=data['email'],
            password=hashed_password.decode('utf-8')
        )

        # Simpan ke database
        db.session.add(new_user)
        db.session.commit()

        return jsonify({"message": "Registrasi berhasil"}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Login
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        # Validasi input
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({"error": "Username dan password harus diisi"}), 400

        # Cari user
        user = User.query.filter_by(username=data['username']).first()
        if not user:
            return jsonify({"error": "Username atau password salah"}), 401

        # Verifikasi password
        if not bcrypt.checkpw(data['password'].encode('utf-8'), user.password.encode('utf-8')):
            return jsonify({"error": "Username atau password salah"}), 401

        # Buat token
        access_token = create_access_token(
            identity=user.username,
            expires_delta=timedelta(days=1)
        )

        return jsonify({
            "message": "Login berhasil",
            "token": access_token,
            "username": user.username
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Routes
@app.route('/api/products', methods=['GET'])
@jwt_required()
def get_products():
    products = Product.query.all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'description': p.description,
        'quantity': p.quantity,
        'min_quantity': p.min_quantity
    } for p in products])

@app.route('/api/products', methods=['POST'])
@jwt_required()
def create_product():
    product_schema = ProductSchema()
    try:
        data = product_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': err.messages}), 400
    
    new_product = Product(
        name=data['name'],
        description=data.get('description', ''),
        quantity=data['quantity'],
        min_quantity=data.get('min_quantity', 0)
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify({'message': 'Product created successfully'}), 201

@app.route('/api/products/<int:id>', methods=['GET'])
@jwt_required()
def get_product(id):
    try:
        product = Product.query.get_or_404(id)
        return jsonify({
            'id': product.id,
            'name': product.name,
            'description': product.description,
            'quantity': product.quantity,
            'min_quantity': product.min_quantity
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/products/<int:id>', methods=['PUT'])
@jwt_required()
def update_product(id):
    try:
        product = Product.query.get_or_404(id)
        data = request.get_json()
        
        product.name = data.get('name', product.name)
        product.description = data.get('description', product.description)
        product.quantity = data.get('quantity', product.quantity)
        product.min_quantity = data.get('min_quantity', product.min_quantity)
        
        db.session.commit()
        return jsonify({"message": "Product updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/products/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_product(id):
    try:
        product = Product.query.get_or_404(id)
        db.session.delete(product)
        db.session.commit()
        return jsonify({"message": "Product deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/products/low-stock', methods=['GET'])
@jwt_required()
def get_low_stock():
    low_stock_products = Product.query.filter(Product.quantity <= Product.min_quantity).all()
    product_schema = ProductSchema(many=True)
    return jsonify(product_schema.dump(low_stock_products))

@app.route('/api/reports', methods=['GET'])
@jwt_required()
def generate_report():
    format_type = request.args.get('format', 'pdf')
    products = Product.query.all()
    
    if format_type == 'pdf':
        # Membuat PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []

        # Data untuk tabel
        data = [['Nama Produk', 'Deskripsi', 'Stok', 'Stok Minimum']]
        for product in products:
            data.append([
                product.name,
                product.description,
                str(product.quantity),
                str(product.min_quantity)
            ])

        # Membuat tabel
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(table)
        doc.build(elements)
        
        buffer.seek(0)
        return send_file(
            buffer,
            download_name='inventory_report.pdf',
            as_attachment=True,
            mimetype='application/pdf'
        )

    elif format_type == 'excel':
        # Membuat Excel
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet()

        # Format untuk header
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#4B5563',
            'font_color': 'white'
        })

        # Menulis header
        headers = ['Nama Produk', 'Deskripsi', 'Stok', 'Stok Minimum']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)

        # Menulis data
        for row, product in enumerate(products, start=1):
            worksheet.write(row, 0, product.name)
            worksheet.write(row, 1, product.description)
            worksheet.write(row, 2, product.quantity)
            worksheet.write(row, 3, product.min_quantity)

        # Menyesuaikan lebar kolom
        worksheet.set_column('A:A', 20)
        worksheet.set_column('B:B', 30)
        worksheet.set_column('C:D', 15)

        workbook.close()
        output.seek(0)

        return send_file(
            output,
            download_name='inventory_report.xlsx',
            as_attachment=True,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    return jsonify({'error': 'Format tidak didukung'}), 400

if __name__ == '__main__':
    try:
        with app.app_context():
            db.create_all()
            print("Database tables created successfully.")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        print("Please check your database connection and configuration.")
    
    try:
        app.run(debug=True)
    except Exception as e:
        print(f"Error starting Flask application: {e}")
