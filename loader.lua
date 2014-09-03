_G.console = {
	log = function (this, ...)
		print(...)
	end
}

_G.typeof = function (arg)
	return type(arg)
end

require('bytecode')