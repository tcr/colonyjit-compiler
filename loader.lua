_G.console = {
	log = function (this, ...)
		print(...)
	end
}

_G.typeof = function (arg)
	return type(arg)
end

_G.empty = function () end

local output
if arg[1] ~= nil then
	local file = assert(io.popen('./colonyjit-compiler ' .. arg[1], 'r'))
	output = file:read('*all')
	file:close()
else
	output = io.read("*a")
end
load(output)()
