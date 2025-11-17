import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import VendaMensal from "./VendaMensal.js"

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware - uma função que trata as informações recebidas

app.use(express.json());


const connectDB = async () => {
    try{
      await mongoose.connect(process.env.MONGO_URI)
      console.log("Conectado ao MongoDB");
    } catch(error) {
      console.log("Deu erro ao conectar com o MongoDB", error);
    }
    
};

connectDB();

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API está funcionando corretamente",
    timestamp: new Date().toISOString()
  });
});

// CREATE
app.post("/vendas", async (req, res) => {
    try{
      const novaVendaMensal = await VendaMensal.create(req.body);
      res.status(201).json(novaVendaMensal);
    } catch (error) {
        res.status(500).json({ error: error });
    }
  

});

app.get("/", (req, res) => {

});

// READ
app.get("/vendas", async (req, res) => {
    try {
      const vendasMensais = await VendaMensal.find();
      res.status(200).json(vendasMensais);
    } catch (error) {
      res.status(500).json({ error: error });
    }
  });

  // READ BY ID
  app.get("/vendas/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "ID é obrigatório",
          data: null
        });
      }
      if (id.length !== 24) {
        return res.status(400).json({
          success: false,
          error: "ID deve ter 24 caracteres",
          data: null
        });
      }
      const vendaMensal = await VendaMensal.findById(req.params.id);
      res.status(200).json(vendaMensal);
    } catch (error) {
      res.status(500).json({ error: error });
    }
  });
  
  // UPDATE
  app.put("/vendas/:id", async (req, res) => {
    try {
      const novaVendaMensal = await VendaMensal.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      res.status(200).json(novaVendaMensal);
    } catch (error) {
      res.status(500).json({ error: error });
    }
  });
  
  // DELETE
  app.delete("/vendas/:id", async (req, res) => {
    try {
      const vendaMensalExcluida = await VendaMensal.findByIdAndDelete(
        req.params.id
      );
      res.status(200).json(vendaMensalExcluida);
    } catch (error) {
      res.status(500).json({ error: error });
    }
  });

  // ANÁLISE - Vendas agrupadas por mês (usando agregação MongoDB)
  app.get("/vendas/analise", async (req, res) => {
    try {
      // Usar agregação do MongoDB para agrupar e somar vendas por mês
      const vendasAgrupadas = await VendaMensal.aggregate([
        {
          $group: {
            _id: "$mes",
            totalVendido: { $sum: "$valorVendido" },
            quantidadeVendas: { $sum: 1 }
          }
        },
        {
          $sort: { totalVendido: -1 }
        },
        {
          $project: {
            _id: 0,
            mes: "$_id",
            totalVendido: 1,
            quantidadeVendas: 1
          }
        }
      ]);

      // Calcular totais e média
      const valorTotal = vendasAgrupadas.reduce((sum, v) => sum + v.totalVendido, 0);
      const media = vendasAgrupadas.length > 0 ? valorTotal / vendasAgrupadas.length : 0;

      res.status(200).json({
        mesMaisVendeu: vendasAgrupadas.length > 0 ? vendasAgrupadas[0] : null,
        todosOsMeses: vendasAgrupadas,
        resumo: {
          totalMeses: vendasAgrupadas.length,
          valorTotalVendido: valorTotal,
          mediaVendas: media
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/vendas/relatorio", async (req, res) => {
    try {
      const resultado = await VendaMensal.aggregate([
        {
          $group: {
            _id: "$mes",
            totalVendido: { $sum: "$valorVendido" }
          }
        },
        {
          $sort: { totalVendido: -1 }
        },
        {
          $limit: 1
        },
        {
          $project: {
            _id: 0,
            mes: "$_id",
            totalVendido: 1
          }
        }
      ]);

      const mesMaisVendeu = resultado.length > 0 ? resultado[0] : null;

      // Nome do mês
      const nomesMeses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];

      res.status(200).json({
        mes: mesMaisVendeu ? mesMaisVendeu.mes : null,
        nomeMes: mesMaisVendeu ? nomesMeses[mesMaisVendeu.mes - 1] : null,
        valorTotalVendido: mesMaisVendeu ? mesMaisVendeu.totalVendido : 0,
        mensagem: mesMaisVendeu 
          ? `O mês que mais vendeu foi ${nomesMeses[mesMaisVendeu.mes - 1]} com R$ ${mesMaisVendeu.totalVendido.toFixed(2)}`
          : "Não há vendas cadastradas"
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

app.listen(PORT, () => console.log(`O servidor está rodando na porta ${PORT}`));