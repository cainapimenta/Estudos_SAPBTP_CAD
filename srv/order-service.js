const cds = require('@sap/cds');

class OrderService extends cds.ApplicationService {
	init() {
		const {
			OrderHeader,
			OrderItens,
			Produtos
		} = this.entities;

		this.before('UPDATE', OrderItens.drafts, async req => {
			if (req.data.quantity || req.data.unitCost) {
				const orderItem = await SELECT.from(OrderItens.drafts, req.data.ID);

				const valorNovo = parseFloat(req.data.quantity) || orderItem.quantity;
				const valorBanco = parseFloat(req.data.unitCost) || orderItem.unitCost;
				req.data.total = valorNovo * valorBanco;
			}
		});

		this.after(['CREATE', 'UPDATE', 'DELETE'], OrderItens.drafts, async (_, req) => {
			console.log(req.data.order_ID);

			await update_totals(req.data.order_ID);
		});

		const update_totals = async order_ID => {
			const itens = await SELECT.one('sum(quantity * unitCost) as Total')
				.from(OrderItens.drafts)
				.where({ order_ID: order_ID });

			if (itens) {
				await UPDATE(OrderHeader.drafts, order_ID)
					.set`total = ${itens.Total}`;
			}
		}

		this.on('aprovarOrder', async (req) => {
			const order_ID = req.params[0].ID;
			console.log(req.data);

			await UPDATE(OrderHeader, order_ID).with({ status_code: req.data.statusCode });
		});

		return super.init();
	}
}

module.exports = { OrderService };