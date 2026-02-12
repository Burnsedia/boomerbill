// Chart.js initialization - must run before any vue-chartjs imports
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, BarElement, ArcElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, BarElement, ArcElement, CategoryScale, LinearScale)

export default ChartJS
