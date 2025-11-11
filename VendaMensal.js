import mongoose from "mongoose";

const VendaMensalSchema = new mongoose.Schema({
    mes: Number,
    valorVendido: Number,
});

export default mongoose.model("vendaMensal", VendaMensalSchema);